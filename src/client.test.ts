import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WarframeStatusClient, WarframeStatusError } from "./client.js";

describe("WarframeStatusClient", () => {
  it("requests the pc platform path by default with language", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify([{ id: "1" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new WarframeStatusClient({ fetchImpl });
    const alerts = await client.getAlerts();

    assert.deepEqual(alerts, [{ id: "1" }]);
    assert.equal(calls.length, 1);
    assert.match(calls[0]!, /\/pc\/alerts\?language=en$/);
  });

  it("throws WarframeStatusError on non-OK responses", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("nope", { status: 404 });

    const client = new WarframeStatusClient({ fetchImpl });
    await assert.rejects(
      () => client.getSortie(),
      (error: unknown) => {
        assert.ok(error instanceof WarframeStatusError);
        assert.equal(error.status, 404);
        return true;
      },
    );
  });

  it("loads cycles from a single worldstate response", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      assert.match(String(input), /\/pc\?language=en$/);
      return new Response(
        JSON.stringify({
          cetusCycle: { state: "day", timeLeft: "12m" },
          vallisCycle: { state: "cold", timeLeft: "4m" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = new WarframeStatusClient({ fetchImpl });
    const cycles = await client.getCycles();
    assert.equal(cycles.cetusCycle?.state, "day");
    assert.equal(cycles.vallisCycle?.state, "cold");
    assert.deepEqual(cycles.earthCycle, {});
  });
});

