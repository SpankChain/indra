#!/bin/bash
set -e

echo "Activating hub tester.."
date "+%s" > /tmp/timestamp

project=connext
root=`pwd | sed 's/indra.*/indra/'`

POSTGRES_DB="test_$project"
POSTGRES_USER="$project"
POSTGRES_PASSWORD="$project"
POSTGRES_HOST="${project}_database_test"
DATABASE="$POSTGRES_HOST:5432"
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$DATABASE/$POSTGRES_DB"

REDIS_HOST="${project}_redis_test"
REDIS="$REDIS_HOST:6379"
REDIS_URL="redis://$REDIS"

ETHPROVIDER_HOST="${project}_ethprovider_test"
ETH_RPC_URL="$ETHPROVIDER_HOST:8545"

# Kill the test database when this script exits
function cleanup {
  echo "Tests finished, stopping test containers.."
  docker container stop $REDIS_HOST 2> /dev/null || true
  docker container stop $ETHPROVIDER_HOST 2> /dev/null || true
  docker container stop $POSTGRES_HOST 2> /dev/null || true
  docker container stop ${project}_tester 2> /dev/null || true
  echo "Testing hub complete in $((`date "+%s"` - `cat /tmp/timestamp`)) seconds!"
}
trap cleanup EXIT

docker container prune -f

docker network create --attachable $project 2> /dev/null || true

# Start test redis
echo "Starting redis.."
docker run --detach --name=$REDIS_HOST --network=$project redis:5-alpine

# Start test database
echo "Starting database.."
docker run --detach --name=$POSTGRES_HOST --network=$project \
  --env POSTGRES_DB=$POSTGRES_DB \
  --env POSTGRES_USER=$POSTGRES_USER \
  --env POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  --tmpfs /var/lib/postgresql/data \
  ${project}_database:dev

# Start test ethprovider
echo "Starting ethprovider.."
docker run --detach --name=$ETHPROVIDER_HOST --network=$project \
  --env ETH_NETWORK_ID=4447 \
  --env ETH_MNEMONIC="candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" \
  --volume $root/modules/contracts:/root \
  ${project}_ethprovider:dev

# Run tests
echo "Starting hub tester.."
docker run --tty --name ${project}_tester --network=$project \
  --env ETHPROVIDER_HOST=$ETHPROVIDER_HOST \
  --env REDIS_HOST=$REDIS_HOST \
  --env POSTGRES_HOST=$POSTGRES_HOST \
  --env POSTGRES_DB=$POSTGRES_DB \
  --env POSTGRES_USER=$POSTGRES_USER \
  --env POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  --env DATABASE=$DATABASE \
  --env DATABASE_URL_TEST=$DATABASE_URL \
  --env REDIS=$REDIS \
  --env REDIS_URL_TEST=$REDIS_URL \
  --env ETH_RPC_URL_TEST=$ETH_RPC_URL \
  --volume $root/modules/hub:/root \
  --entrypoint=bash ${project}_hub:dev -c '
    set -e
    echo "Waiting for $POSTGRES_HOST:5433 & $DATABASE && $REDIS && $ETH_RPC_URL_TEST to wake up.."
    bash ops/wait-for.sh -t 60 $POSTGRES_HOST:5433 2> /dev/null
    bash ops/wait-for.sh -t 60 $DATABASE 2> /dev/null
    bash ops/wait-for.sh -t 60 $REDIS 2> /dev/null
    bash ops/wait-for.sh -t 60 $ETH_RPC_URL_TEST 2> /dev/null
    ./node_modules/.bin/mocha \
      -r ./dist/register/common.js \
      -r ./dist/register/testing.js \
      "dist/**/*.test.js" --exit
  '