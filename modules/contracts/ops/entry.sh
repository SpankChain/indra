#!/bin/bash
set -e

########################################
# env setup

ganache_net_id=4447
ganache_rpc_port=8545
migration_flag_port=8544

########################################
# Start local testnet if in dev mode

if [[ "$ETH_NETWORK" == "ganache" ]]
then
  echo "Starting Ganache.."
  mkdir -p /data build/contracts
  ./node_modules/.bin/ganache-cli \
    --host="0.0.0.0" \
    --port="$ganache_rpc_port" \
    --db="/data" \
    --mnemonic="$ETH_MNEMONIC" \
    --networkId="$ganache_net_id" \
    --blockTime=3 > ops/ganache.log &
  bash /ops/wait-for.sh localhost:8545 2> /dev/null
fi

########################################
# migrate migration script

echo "Running migration script.."

node ops/migrate.js

########################################
# In dev-mode, signal that we're done deploying contracts

if [[ "$ETH_NETWORK" == "ganache" && "$1" == "signal" ]]
then
  echo "===> Signalling the completion of migrations..."
  while true # unix.stackexchange.com/a/37762
  do sleep 2 && echo 'eth migrations complete' | nc -lk -p $migration_flag_port
  done > /dev/null
fi
