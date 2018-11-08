import Component from "@ember/component";
import layout from "../templates/components/test-component";

export default Component.extend({
  name: "12s",

  layout,
  actions: {
	doIt() {
		alert(3);
	}
  }
});
