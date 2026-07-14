#![allow(dead_code)]
// ============================================================================
// CONSTANTS
// ============================================================================

/// Gravitational acceleration (m/s²)
pub const GRAVITY: f64 = 9.81;

/// Human skeletal muscle mechanical efficiency during concentric contractions.
/// ~25% of metabolic energy becomes mechanical work; ~75% is heat.
pub const MECHANICAL_EFFICIENCY: f64 = 0.25;

/// Eccentric phase metabolic cost relative to concentric.
/// Eccentric work costs roughly 50% of concentric metabolically.
pub const ECCENTRIC_COST_RATIO: f64 = 0.50;

/// Isometric metabolic rate factor (empirical).
/// Represents energy cost per newton of force per second of hold,
/// scaled to be used as: E_iso = force_N * iso_factor * time_s / efficiency
pub const ISOMETRIC_FACTOR: f64 = 0.003;

/// Joules per kilocalorie
pub const JOULES_PER_KCAL: f64 = 4184.0;

// ============================================================================
// SEGMENT MASS FRACTIONS (Winter 2009 / Dempster anthropometric data)
// ============================================================================

/// Fraction of total body mass for each body segment.
/// Used to compute the mass of moving body parts during exercises.
pub struct SegmentMassFractions;

impl SegmentMassFractions {
    pub const HEAD_NECK: f64 = 0.081;
    pub const TRUNK: f64 = 0.497;
    pub const UPPER_ARM: f64 = 0.028; // per arm
    pub const LOWER_ARM_HAND: f64 = 0.022; // per arm
    pub const UPPER_LEG: f64 = 0.100; // per leg
    pub const LOWER_LEG_FOOT: f64 = 0.061; // per leg

    /// Center of mass position as fraction from proximal joint
    pub const COM_TRUNK: f64 = 0.440;
    pub const COM_UPPER_ARM: f64 = 0.436;
    pub const COM_LOWER_ARM: f64 = 0.682;
    pub const COM_UPPER_LEG: f64 = 0.433;
    pub const COM_LOWER_LEG: f64 = 0.606;
}
