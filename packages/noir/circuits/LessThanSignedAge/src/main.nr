// NOTE: a lot of inspiration taken from https://noir-by-example.org/gadgets/zk-age-verification
use ::std;

fn u16_to_u8_2(
    input: u16
) -> [u8; 2] {
    let mut output: [u8; 2] = [0; 2];
    for bit_pos in 0..2 {
        let shift_amount: u16 = 8 - (bit_pos * 8) as u16;
        output[bit_pos] = ((input >> shift_amount) & 255) as u8;
    }
    output
}

#[test]
fn test_u16_to_u8_2() {
    let expected: [u8; 2] = [ 0x07, 0xdf ];
    let actual: [u8; 2] = u16_to_u8_2(2015);
    assert(expected == actual);
}

fn construct_claim_payload(subject_eth_address: [u8; 20], subject_birth_year: u16) -> [u8; 32] {
    let mut packed_bytes: [u8; 22] = [0; 22];
    for i in 0..20 {
        packed_bytes[i] = subject_eth_address[i];
    }
    let birth_year_bytes = u16_to_u8_2(subject_birth_year);
    packed_bytes[20] = birth_year_bytes[0];
    packed_bytes[21] = birth_year_bytes[1];
    let hash = std::hash::blake2s(packed_bytes);
    hash
}

fn check_claim(
    required_birth_year: u16,
    subject_birth_year: u16,
) {
  assert(required_birth_year < subject_birth_year);
}

#[test]
fn test_check_claim() {
    check_claim(2015, 2016);
}

fn main(
    required_birth_year: pub u16,
    issuer_public_key_x: pub [u8; 32],
    issuer_public_key_y: pub [u8; 32],
    subject_eth_address: pub [u8; 20],

    issuer_signed_message: [u8; 64],
    subject_birth_year: u16,
) {
    check_claim(required_birth_year, subject_birth_year);
    let claim_payload = construct_claim_payload(subject_eth_address, subject_birth_year);
    assert(std::ecdsa_secp256k1::verify_signature(
      issuer_public_key_x,
      issuer_public_key_y,
      issuer_signed_message,
      claim_payload,
    ));
    // TODO: use below code when this issue is resolved: https://github.com/Kryha/scaffold-eth-2-noir/issues/12
    // let is_verified = std::ecdsa_secp256k1::verify_signature(
    //   issuer_public_key_x,
    //   issuer_public_key_y,
    //   issuer_signed_message,
    //   claim_payload,
    // );
    // assert(is_verified);
}
