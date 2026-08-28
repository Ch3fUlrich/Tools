//! Validation for saved Elterngeld optimizer scenarios.
//!
//! The payload itself is opaque to the backend — the browser owns the tax model and its
//! input shape. What the backend does own is the envelope: a scenario needs a usable name,
//! and a JSONB blob is only allowed to be so large before it stops being "a form the user
//! filled in" and starts being a way to fill the disk.

/// Longest scenario name we store. Comfortably past "Both parents, 2027, split 8/6" while
/// still fitting a list row without truncation.
pub const MAX_NAME_CHARS: usize = 80;

/// Largest serialized payload we accept. The optimizer has ~25 short fields, so a full form
/// is well under 2 KB; 64 KB leaves room for the shape to grow without inviting abuse.
pub const MAX_PAYLOAD_BYTES: usize = 64 * 1024;

/// Most scenarios one user may keep. Enough for a year of what-ifs, bounded so a script
/// cannot grow the table without limit.
pub const MAX_SCENARIOS_PER_USER: i64 = 100;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScenarioError {
    NameMissing,
    NameTooLong,
    PayloadNotObject,
    PayloadTooLarge,
    TooManyScenarios,
}

impl ScenarioError {
    pub fn message(self) -> &'static str {
        match self {
            ScenarioError::NameMissing => "name must not be empty",
            ScenarioError::NameTooLong => "name is too long",
            ScenarioError::PayloadNotObject => "payload must be a JSON object",
            ScenarioError::PayloadTooLarge => "payload is too large",
            ScenarioError::TooManyScenarios => "saved scenario limit reached",
        }
    }
}

/// Trim a name the way it will be stored, so validation and persistence agree.
pub fn normalize_name(name: &str) -> String {
    name.trim().to_string()
}

/// Check the envelope of a scenario about to be saved.
///
/// Counts *characters* for the name (a 80-emoji name is as wide as 80 letters, but four
/// times the bytes) and *bytes* for the payload (what actually occupies the row).
pub fn validate_scenario(
    name: &str,
    payload: &serde_json::Value,
) -> Result<String, ScenarioError> {
    let name = normalize_name(name);
    if name.is_empty() {
        return Err(ScenarioError::NameMissing);
    }
    if name.chars().count() > MAX_NAME_CHARS {
        return Err(ScenarioError::NameTooLong);
    }
    // An array or a bare number would round-trip, but the frontend always sends an object
    // and accepting anything else just means a confusing failure later, on read.
    if !payload.is_object() {
        return Err(ScenarioError::PayloadNotObject);
    }
    if payload.to_string().len() > MAX_PAYLOAD_BYTES {
        return Err(ScenarioError::PayloadTooLarge);
    }
    Ok(name)
}

/// Whether a user may add one more scenario. Overwriting an existing name is always allowed,
/// so the caller passes `true` when the save is an update rather than an insert.
pub fn check_quota(current_count: i64, is_update: bool) -> Result<(), ScenarioError> {
    if is_update || current_count < MAX_SCENARIOS_PER_USER {
        Ok(())
    } else {
        Err(ScenarioError::TooManyScenarios)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn accepts_a_normal_scenario() {
        let name = validate_scenario("Base case", &json!({"filing": "married"})).unwrap();
        assert_eq!(name, "Base case");
    }

    #[test]
    fn trims_surrounding_whitespace_from_the_name() {
        let name = validate_scenario("  Base case \n", &json!({})).unwrap();
        assert_eq!(name, "Base case");
    }

    #[test]
    fn rejects_a_blank_name() {
        assert_eq!(
            validate_scenario("   ", &json!({})).unwrap_err(),
            ScenarioError::NameMissing
        );
    }

    #[test]
    fn rejects_an_overlong_name() {
        let long = "x".repeat(MAX_NAME_CHARS + 1);
        assert_eq!(
            validate_scenario(&long, &json!({})).unwrap_err(),
            ScenarioError::NameTooLong
        );
    }

    #[test]
    fn counts_name_length_in_characters_not_bytes() {
        // 80 multi-byte characters is 320 bytes but still a legal 80-character name.
        let emoji = "\u{1f37c}".repeat(MAX_NAME_CHARS);
        assert!(validate_scenario(&emoji, &json!({})).is_ok());
    }

    #[test]
    fn rejects_a_payload_that_is_not_an_object() {
        assert_eq!(
            validate_scenario("n", &json!([1, 2, 3])).unwrap_err(),
            ScenarioError::PayloadNotObject
        );
        assert_eq!(
            validate_scenario("n", &json!("string")).unwrap_err(),
            ScenarioError::PayloadNotObject
        );
    }

    #[test]
    fn rejects_an_oversized_payload() {
        let big = json!({ "blob": "y".repeat(MAX_PAYLOAD_BYTES) });
        assert_eq!(
            validate_scenario("n", &big).unwrap_err(),
            ScenarioError::PayloadTooLarge
        );
    }

    #[test]
    fn quota_blocks_a_new_scenario_at_the_limit_but_allows_an_overwrite() {
        assert!(check_quota(MAX_SCENARIOS_PER_USER - 1, false).is_ok());
        assert_eq!(
            check_quota(MAX_SCENARIOS_PER_USER, false).unwrap_err(),
            ScenarioError::TooManyScenarios
        );
        assert!(check_quota(MAX_SCENARIOS_PER_USER, true).is_ok());
    }
}
