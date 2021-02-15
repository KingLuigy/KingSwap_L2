#!/usr/bin/env bash
# Usage:
#   start-ksw.sh [--no-deploy] [--start-and-exit] [--pid-file=<path>] [--log-file=<path>]

set -o errexit

trap on_exit EXIT

NO_DEPLOY=
START_ONLY=
pid_file=
log_file="./ganache-log.txt"

while [[ $# -gt 0 ]]
do
  case $1 in
    --no-deploy)
      NO_DEPLOY=yes
      ;;
    --start-and-exit)
      START_ONLY=yes
      ;;
    --pid-file=*)
      pid_file="${1#*=}"
      shift
      ;;
    --log-file=*)
      log_file="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown param '${1}'"
      exit 1
  esac
  shift
done

is_ganache_running() {
  ps -p "${ganache_pid}" > /dev/null;
}

on_exit() {
  [ -n "${START_ONLY}" ] && return
  shutdown_ganache
}

shutdown_ganache() {
  if [ -n "${ganache_pid}" ] && is_ganache_running; then
    kill -9 "${ganache_pid}" 1>"${log_file}" 2>&1 && echo -e "\nganache-cli (${ganache_pid}) killed"
  fi
}

ganache_port=8555
networkId=2020
echo "Starting ganache-cli (port: ${ganache_port}, networkId: ${networkId})"
npx --quiet ganache-cli \
  --port "${ganache_port}" \
  --networkId "${networkId}" \
  --gasLimit 7000000 \
  --defaultBalanceEther 1000000 \
  --deterministic --mnemonic "lounge canvas attack visit knife kick pave drift perfect pig behave suggest" \
  1>>"${log_file}" &

ganache_pid=$!
[ -n "${pid_file}" ] && {
  disown
  echo "${ganache_pid}" > "${pid_file}"
}

[ -n "${START_ONLY}" ] && { echo "Done (Started)" ; exit; }

sleep 1
[ -z "${NO_DEPLOY}" ] && truffle migrate --network ksw

echo "✓ ready"
echo "press 'ctrl+c' to terminate..."

while is_ganache_running; do sleep 1; done

echo "Done. Terminating..."
