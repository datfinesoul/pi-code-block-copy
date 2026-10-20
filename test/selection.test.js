import assert from "node:assert/strict";
import { test } from "node:test";

import { toggleNumberedSelection } from "../src/selection.js";

const items = (count) => Array.from({ length: count }, (_, index) => ({ index: index + 1 }));

test("numbered items toggle and can be selected together", () => {
  const initial = new Set();
  const oneSelected = toggleNumberedSelection(items(9), initial, 1);
  assert.deepEqual([...oneSelected], [1]);

  const twoSelected = toggleNumberedSelection(items(9), oneSelected, 3);
  assert.deepEqual([...twoSelected], [1, 3]);

  const oneDeselected = toggleNumberedSelection(items(9), twoSelected, 1);
  assert.deepEqual([...oneDeselected], [3]);
  assert.deepEqual([...initial], []);
});

test("number 9 selects the ninth item when it is available", () => {
  const selected = toggleNumberedSelection(items(9), new Set(), 9);
  assert.deepEqual([...selected], [9]);
});

test("ignores indices outside 1-9 and numbers missing from the active view", () => {
  const selected = new Set([1]);
  for (const index of [0, 10, 1.5]) {
    assert.equal(toggleNumberedSelection(items(3), selected, index), null);
  }
  assert.equal(toggleNumberedSelection(items(2), selected, 3), null);
  assert.deepEqual([...selected], [1]);
});
