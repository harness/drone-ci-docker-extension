#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

PIPELINE_PID_FILENAME="${BASH_ARGV[0]}"

if [ -n "$PIPELINE_PID_FILENAME" ];
then 
	printf "\nKilling pipeline\n"
	kill "$(cat "${SCRIPT_DIR}/${PIPELINE_PID_FILENAME}.pid")"
fi