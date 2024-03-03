import { expect, test } from "bun:test";

// test snapshots of the generated code
// these tests rely on the jsx2ttlPlugin being loaded via bunfig.toml

import Profile from "../jsx/simple_static";
test("simple_static", () => {
  expect(Profile().toString()).toMatchSnapshot();
});

import Gallery from "../jsx/nested_static";
test("nested_static", () => {
  expect(Gallery().toString()).toMatchSnapshot();
});

import CWithProps from "../jsx/simple_props";
test("simple_props", () => {
  expect(CWithProps({count: 11}).toString()).toMatchSnapshot();
});

import App from "../jsx/nested_props";
test("nested_props", () => {
  expect(App({name: "bar"}).toString()).toMatchSnapshot();
});


