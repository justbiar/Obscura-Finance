// Obscura Finance - ZK Credit Score Verification Circuit (Noir)
//
// Proves that a user's credit score meets the minimum threshold
// WITHOUT revealing the actual score. Uses Pedersen hash for commitments.
//
// Private inputs: credit_score, user_secret
// Public inputs: min_score, secret_hash

use std::hash::pedersen_hash;

fn main(
    credit_score: Field,       // private: user's actual credit score
    user_secret: Field,        // private: user's secret key for commitment

    min_score: pub Field,      // public: minimum required score
    secret_hash: pub Field,    // public: commitment hash (anti-replay)
) {
    // Step 1: Validate score range (0-1000)
    let score_u32 = credit_score as u32;
    let min_u32 = min_score as u32;
    assert(score_u32 <= 1000, "Credit score must be between 0 and 1000");

    // Step 2: Check score meets minimum threshold (core ZK proof)
    assert(score_u32 >= min_u32, "Credit score does not meet minimum threshold");

    // Step 3: Verify commitment (Pedersen hash of user_secret)
    let computed_hash = pedersen_hash([user_secret]);
    assert(computed_hash == secret_hash, "Commitment verification failed");
}

// Tests
#[test]
fn test_valid_credit_score() {
    let test_secret = 12345;
    let test_hash = pedersen_hash([test_secret]);
    main(800, test_secret, 750, test_hash);
}

#[test]
fn test_exact_minimum_score() {
    let test_secret = 99999;
    let test_hash = pedersen_hash([test_secret]);
    main(750, test_secret, 750, test_hash);
}

#[test]
fn test_maximum_score() {
    let test_secret = 42;
    let test_hash = pedersen_hash([test_secret]);
    main(1000, test_secret, 750, test_hash);
}

#[test(should_fail_with = "Credit score does not meet minimum threshold")]
fn test_insufficient_credit_score() {
    let test_secret = 12345;
    let test_hash = pedersen_hash([test_secret]);
    main(600, test_secret, 750, test_hash);
}

#[test(should_fail_with = "Credit score must be between 0 and 1000")]
fn test_invalid_score_range() {
    let test_secret = 12345;
    let test_hash = pedersen_hash([test_secret]);
    main(1500, test_secret, 750, test_hash);
}

#[test(should_fail_with = "Commitment verification failed")]
fn test_invalid_commitment() {
    let real_secret = 12345;
    let fake_secret = 99999;
    let fake_hash = pedersen_hash([fake_secret]);
    main(800, real_secret, 750, fake_hash);
}
