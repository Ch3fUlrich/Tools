#!/usr/bin/env bash
# Which omnigraph server am I actually talking to, and does this repo's graph exist there?
#
# Run this BEFORE reporting anything about graph contents. There are two servers holding
# different graphs behind different tokens — a local dev stack in Docker and the central
# one — and every API call answers about whichever you are pointed at. A 404 from the
# wrong server is indistinguishable from a graph that does not exist, which is exactly
# how "the tools graph does not exist on the remote" got reported about localhost.
#
#   bash scripts/omnigraph-preflight.sh
#
# Env: OMNIGRAPH_BASE_URL (required), OMNIGRAPH_TOKEN (required), OMNIGRAPH_GRAPH_ID
# (defaults to the graph this repo pins in .mcp.json).

set -uo pipefail

GRAPH_ID="${OMNIGRAPH_GRAPH_ID:-tools}"
CENTRAL="https://omnigraph.ohje.ooguy.com"
LOCAL="http://localhost:8080"

fail=0
note() { printf '  %s\n' "$*"; }

if [ -z "${OMNIGRAPH_BASE_URL:-}" ]; then
  echo "OMNIGRAPH_BASE_URL is unset."
  note "There is no safe default: unset used to mean localhost, which silently answered"
  note "about the local dev stack instead of the central server. Set it explicitly:"
  note "  export OMNIGRAPH_BASE_URL=$CENTRAL   # central"
  note "  export OMNIGRAPH_BASE_URL=$LOCAL     # local dev stack"
  exit 2
fi

BASE="${OMNIGRAPH_BASE_URL%/}"
case "$BASE" in
  "$LOCAL"|http://127.0.0.1:8080) WHICH="LOCAL dev stack (Docker)" ;;
  "$CENTRAL")                     WHICH="CENTRAL server" ;;
  *)                              WHICH="unrecognised — neither the known local nor central URL" ;;
esac

echo "Server:  $BASE"
echo "Which:   $WHICH"
echo "Graph:   $GRAPH_ID"
echo

if [ -z "${OMNIGRAPH_TOKEN:-}" ]; then
  echo "OMNIGRAPH_TOKEN is unset — every call will return 'missing bearer token'."
  echo "Note the two servers take DIFFERENT tokens; the one in agent-skills/infra/"
  echo "mcp-servers/.env.shared is the LOCAL one and is rejected by the central server."
  exit 2
fi

AUTH="Authorization: Bearer $OMNIGRAPH_TOKEN"
curl_code() { curl -s --max-time 20 -o /dev/null -w '%{http_code}' "$@"; }

health=$(curl_code "$BASE/healthz")
if [ "$health" != "200" ]; then
  echo "healthz: HTTP $health — server unreachable or not running."
  note "Local stack lives in Docker as 'omnigraph-server'; check 'docker ps'."
  exit 1
fi
echo "healthz: ok"

graphs_code=$(curl_code -H "$AUTH" "$BASE/graphs")
if [ "$graphs_code" = "401" ] || [ "$graphs_code" = "403" ]; then
  echo "graphs:  HTTP $graphs_code — this token is not valid for $WHICH."
  note "The local and central servers take different tokens. Using the local token"
  note "against the central server is the usual cause."
  exit 1
fi

echo -n "graphs:  "
curl -s --max-time 20 -H "$AUTH" "$BASE/graphs" \
  | python -c "import sys,json;d=json.load(sys.stdin);print(', '.join(g['graph_id'] for g in d.get('graphs',[])) or '(none)')" \
  2>/dev/null || { echo "(unparseable response)"; fail=1; }

snap=$(curl_code -H "$AUTH" "$BASE/graphs/$GRAPH_ID/snapshot?branch=main")
case "$snap" in
  200) echo "graph '$GRAPH_ID': present on $WHICH" ;;
  404) echo "graph '$GRAPH_ID': NOT FOUND on $WHICH"
       note "Before concluding it does not exist anywhere, check the OTHER server."
       note "Creating one is an operator action (omnigraph cluster apply); the API has"
       note "no POST /graphs — /graphs exposes only GET."
       fail=1 ;;
  *)   echo "graph '$GRAPH_ID': HTTP $snap"; fail=1 ;;
esac

exit $fail
