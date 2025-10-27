#!/usr/bin/env node

/**
 * Script to generate PDA (Program Derived Address) for mint authority
 * 
 * Usage:
 * node scripts/generate-pda.js [program-id] [seed]
 * 
 * Examples:
 * node scripts/generate-pda.js
 * node scripts/generate-pda.js 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e
 * node scripts/generate-pda.js 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e mint_authority
 */

const { PublicKey } = require('@solana/web3.js');

// Default values
const DEFAULT_PROGRAM_ID = '9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e';
const DEFAULT_SEED = 'mint_authority';

// Get command line arguments
const args = process.argv.slice(2);
const programIdStr = args[0] || DEFAULT_PROGRAM_ID;
const seedStr = args[1] || DEFAULT_SEED;

try {
  // Parse program ID
  const programId = new PublicKey(programIdStr);
  
  // Create seed buffer
  const seed = Buffer.from(seedStr);
  
  // Find the PDA
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [seed],
    programId
  );
  
  // Output results
  console.log('');
  console.log('PDA Generation');
  console.log('='.repeat(60));
  console.log('Program ID:    ', programId.toString());
  console.log('Seed:          ', seedStr);
  console.log('Seed (bytes):  ', Array.from(seed).join(', '));
  console.log('Bump:          ', bump);
  console.log('PDA Address:   ', pda.toString());
  console.log('='.repeat(60));
  console.log('');
  
  // Output for easy copying
  console.log('For Makefile/Scripts:');
  console.log('PDA=' + pda.toString());
  console.log('');
  
} catch (error) {
  console.error('Error:', error.message);
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/generate-pda.js [program-id] [seed]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/generate-pda.js');
  console.log('  node scripts/generate-pda.js 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e');
  console.log('  node scripts/generate-pda.js 9ftLECMyJfEk27kjxyrs3cPh8h6EtKET7gpj8v2RqN1e mint_authority');
  console.log('');
  process.exit(1);
}
