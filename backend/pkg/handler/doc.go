/*
Copyright 2022 Kamesh Sampath<kamesh.sampath@hotmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Package handler defines the REST API handlers for performing data operations on the drone pipelines data.
// The handler handles the following URI:
// GET /stages - fetches all the available stages from the backend
// POST /stages - saves stages to the backend
// PATCH /stage/:id/:status - Update the status of the Stage
// PATCH /step/:id/:status - Update the status of the Step
// DELETE /stages - Delete the stages
// GET /stage/:id/logs - Streaming API to the logs of a stage
package handler
