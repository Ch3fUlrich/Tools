use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub amount: f64,
    pub date: String,
    pub category: String,
    pub comment: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct N26Data {
    pub id: String,
    pub created: String,
    pub data: HashMap<String, Option<Vec<serde_json::Value>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub transactions: Vec<Transaction>,
    pub category_totals: HashMap<String, f64>,
    pub overall_total: f64,
}

/// Parse N26 JSON data and extract transactions
pub fn parse_n26_json(n26_data: N26Data) -> Result<Vec<Transaction>, String> {
    let mut transactions = Vec::new();

    // Process cash26Data
    if let Some(Some(cash_data)) = n26_data.data.get("cash26Data") {
        for entry in cash_data {
            if let (Some(amount), Some(date), Some(tx_type)) = (
                entry.get("amount").and_then(|v| v.as_f64()),
                entry.get("transaction_date").and_then(|v| v.as_str()),
                entry.get("transaction_type").and_then(|v| v.as_str()),
            ) {
                transactions.push(Transaction {
                    amount,
                    date: date.to_string(),
                    category: "cash26Data".to_string(),
                    comment: tx_type.to_string(),
                });
            }
        }
    }

    // Process bankTransfers
    if let Some(Some(bank_data)) = n26_data.data.get("bankTransfers") {
        for entry in bank_data {
            if let (Some(amount), Some(date), Some(reference)) = (
                entry.get("amount").and_then(|v| v.as_f64()),
                entry.get("ts").and_then(|v| v.as_str()),
                entry.get("reference_text").and_then(|v| v.as_str()),
            ) {
                transactions.push(Transaction {
                    amount,
                    date: date.to_string(),
                    category: "bankTransfers".to_string(),
                    comment: reference.to_string(),
                });
            }
        }
    }

    // Process cardTransactions
    if let Some(Some(card_data)) = n26_data.data.get("cardTransactions") {
        for entry in card_data {
            if let (Some(end_amount), Some(date), Some(merchant)) = (
                entry.get("end_amount").and_then(|v| v.as_f64()),
                entry.get("transaction_date").and_then(|v| v.as_str()),
                entry.get("merchant_name").and_then(|v| v.as_str()),
            ) {
                let original_amount = entry
                    .get("original_amount")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(end_amount);

                transactions.push(Transaction {
                    amount: -end_amount,
                    date: date.to_string(),
                    category: "cardTransactions".to_string(),
                    comment: format!("{}: {}", merchant, original_amount),
                });
            }
        }
    }

    Ok(transactions)
}

/// Analyze transactions and calculate totals
pub fn analyze_transactions(transactions: Vec<Transaction>) -> AnalysisResult {
    let mut category_totals: HashMap<String, f64> = HashMap::new();
    let mut overall_total = 0.0;

    for transaction in &transactions {
        *category_totals
            .entry(transaction.category.clone())
            .or_insert(0.0) += transaction.amount;
        overall_total += transaction.amount;
    }

    AnalysisResult {
        transactions,
        category_totals,
        overall_total,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_empty_transactions() {
        let result = analyze_transactions(vec![]);
        assert_eq!(result.transactions.len(), 0);
        assert_eq!(result.overall_total, 0.0);
    }

    #[test]
    fn test_analyze_transactions_with_data() {
        let transactions = vec![
            Transaction {
                amount: 100.0,
                date: "2024-01-01".to_string(),
                category: "income".to_string(),
                comment: "test".to_string(),
            },
            Transaction {
                amount: -50.0,
                date: "2024-01-02".to_string(),
                category: "expense".to_string(),
                comment: "test".to_string(),
            },
        ];

        let result = analyze_transactions(transactions);
        assert_eq!(result.transactions.len(), 2);
        assert_eq!(result.overall_total, 50.0);
        assert_eq!(result.category_totals.get("income"), Some(&100.0));
        assert_eq!(result.category_totals.get("expense"), Some(&-50.0));
    }
}
