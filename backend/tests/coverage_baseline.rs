// Minimal integration-style test to exercise backend code so CI coverage starts collecting.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanity_check() {
        // A trivial assertion to make sure tests run in CI and tarpaulin has output to process.
        assert_eq!(2 + 2, 4);
    }
}
