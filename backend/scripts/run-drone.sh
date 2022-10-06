#!/usr/bin/env bash
# TODO enable debugging
set -e 

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

PIPELINE_FILE="${BASH_ARGV[0]}"

if [ -z "$PIPELINE_FILE" ];
then 
	printf "\nNo pipeline file specified\n"
	# Shall we provide exit codes??
	#exit 1
else
	printf "\n Running pipeline %s\n" "${PIPELINE_FILE}"
	PIPELINE_DIR=$(dirname "${PIPELINE_FILE}")
	PIPELINE_FILE_NAME=$(basename "${PIPELINE_FILE}")
	pushd "${PIPELINE_DIR}" &>/dev/null || true
	DRONE_CMD=("${SCRIPT_DIR}/drone" "exec" "${@:1:$#-1}" "${PIPELINE_FILE_NAME}")
	# printf "\n Command to be run %s\n"  "${DRONE_CMD[*]}"
    bash -c "${DRONE_CMD[*]}"
	popd +1 &>/dev/null || true
fi