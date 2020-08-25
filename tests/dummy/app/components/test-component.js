import Component from "@ember/component";
import layout from "../templates/components/test-component";
import  { action } from "@ember/object";
export default Component.extend({
  name: "12s",
  layout,
	doIt: action(function() {
		alert(3);
	})
});
