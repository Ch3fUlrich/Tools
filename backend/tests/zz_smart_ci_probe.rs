// Synthetic probe for the smart-ci seeded-break check: depends on a docs file
// that the smart-ci map treats as ignorable.
#[test]
fn probe_flag_file_is_ok() {
    let p = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../docs/smart-ci-probe-flag.md");
    assert_eq!(std::fs::read_to_string(p).unwrap().trim(), "ok");
}
