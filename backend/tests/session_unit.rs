use tools_backend::session::SessionStore;
use tools_backend::session::SessionData;
use uuid::Uuid;

#[test]
fn parse_sid_from_cookie_basic() {
    let header = "other=1; sid=abc123; foo=bar";
    let got = SessionStore::parse_sid_from_cookie(header);
    assert_eq!(got, Some("abc123".to_string()));
}

#[test]
fn sessiondata_serde_roundtrip() {
    let data = SessionData { user_id: Uuid::new_v4(), created_at: chrono::Utc::now() };
    let json = serde_json::to_string(&data).expect("serialize");
    let parsed: SessionData = serde_json::from_str(&json).expect("deserialize");
    assert_eq!(parsed.user_id, data.user_id);
    // created_at may lose sub-second precision in formatting; compare date strings
    assert_eq!(parsed.created_at.timestamp(), data.created_at.timestamp());
}
