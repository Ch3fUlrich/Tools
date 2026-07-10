use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct StatsFilterParams {
    pub from: Option<String>,
    pub to: Option<String>,
    pub plan_id: Option<String>,
    pub exercise_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct ExerciseFilterParams {
    pub equipment: Option<String>,
    pub muscle: Option<String>,
    pub pattern: Option<String>,
    pub difficulty: Option<String>,
    pub search: Option<String>,
}
