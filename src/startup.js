/*\
title: $:/plugins/tobibeer/preview/startup.js
type: application/javascript
module-type: startup

Enhances the link widget for on-hover previews

@preserve
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var
	// Get core link widget
	CoreLink = require("$:/core/modules/widgets/link.js").link,
	// Store ref to render() and handleClickEvent()
	renderCore = CoreLink.prototype.render,
	clickCore = CoreLink.prototype.handleClickEvent,
	// Get core popup
	CorePopup =  require("$:/core/modules/utils/dom/popup.js").Popup,
	// Store ref for popupInfo()
	popupInfoCore = CorePopup.prototype.popupInfo;

// Hijack core link widget render()
CoreLink.prototype.render = function() {
	// Run core handler
	renderCore.apply(this,arguments);
	var self = this,
		wiki = this.wiki,
		// The link node
		el = this.domNodes[0],
		// Target tiddler
		to = wiki.getTiddler(self.to),
		// Shortcut to defaults namespace
		defaults = "$:/plugins/tobibeer/preview/defaults/",
		// Modifier keys to quick-show the popup w/o delay
		keys = $tw.utils.parseKeyDescriptor(wiki.getTextReference(defaults+"keys","").toUpperCase()),
		// Delay for popup rendering
		delay = wiki.getTextReference(defaults+"delay").toUpperCase(),
		// Displays the preview popup
		showPopup = function() {
			// Get current popup level
			var level = $tw.popup.popupInfo(el).popupLevel;
			// Stop waiting for other popups to pop up
			clearTimeout(self.previewTimeout);
			// Quite all of outer level
			$tw.popup.cancel(level-1);
			// Level up
			level++;
			// Store reference to tiddler to be previewed for level
			wiki.setText("$:/temp/tobibeer/preview-"+level+"-tiddler","text",null,self.to);
			// Show popup with timeout, to get past nextTick
			setTimeout(function() {
				// Core popup triggering
				$tw.popup.triggerPopup({
					// For this tiddler
					domNode: el,
					// The state for this level
					title: "$:/temp/tobibeer/preview-"+level,
					wiki: wiki
				});
			},50);
		},
		// A helper to determine whether or not to actually show the popu
		show = function (){
			var ex,exclude,
				yes = 1,
				// The css classes in which not to display previews for links
				not = wiki.getTextReference(defaults+"not","");
			// Got any?
			if(not) {
				// Split classes and loop
				$tw.utils.each(not.split(" "),function(n){
					// This node
					var node = el;
					// Loop so long as parent-nodes and still displaying
					while(node && yes) {
						// Node has exclude-class?
						if($tw.utils.hasClass(node,n)){
							// Remember
							yes = 0;
							// Abort
							return false;
						}
						// Next partent
						node = node.parentNode;
					}
				});
			}
			// Not aborted yet? => get exclude filter
			exclude = wiki.getTextReference(defaults+"exclude","");
			// Fetch excluded titles
			ex = exclude ? wiki.filterTiddlers(exclude) : [];
			// Title in excludes?
			if(ex.indexOf(self.to) >= 0) {
				// Then don't display
				yes = 0;
			}
			// Return what we got
			return yes;
		};
	// Turn delay to integer
	delay = delay !== undefined ? parseInt(delay) : null;
	// Not a number?
	if(delay !== null && isNaN(delay)) {
		// No delay
		delay = 0;
	}
	// Target tiddler exists?
	if(to) {
		// Add handle class
		$tw.utils.addClass(el,"tc-popup-handle");
		// Add absolute positioning class
		$tw.utils.addClass(el,"tc-popup-absolute");
		// Loop new event handlers
		["mouseover","mouseout"].forEach(function(e) {
			// Create event listener
			el.addEventListener(e, function(event){
				// Ref to event
				var ev = event || window.event;
				// On mouseover
				if(e === "mouseover") {
					// Actually showing anything?
					if(show()) {
						// No keycode?
						if(!ev.keyCode) {
							// Set to 0, for whatever reason the core expects one
							ev.keyCode = 0;
						}
						// Modifier keys say we show directly?
						if($tw.utils.checkKeyDescriptor(ev,keys)) {
							// Then show
							showPopup();
						// Modifiers don't match but we got a delay?
						} else if(delay !== null) {
							// Set timeout and wait to show popup
							self.previewTimeout = setTimeout(showPopup,delay);
						}
					}
				// Mouseout
				} else {
					// No more waiting for the popup
					clearTimeout(self.previewTimeout);
				}
			});
		});
	}
};

// Hijack click handler
CoreLink.prototype.handleClickEvent = function() {
	// Run core handler
	clickCore.apply(this,arguments);
	// Abort popup delay timeout
	clearTimeout(this.previewTimeout);
	// Close popups
	$tw.popup.cancel(Math.max(0,$tw.popup.popupInfo(this).popupLevel-1));
};

// Hijack popupInfo() of core Popup ($tw.popup)
CorePopup.prototype.popupInfo = function(domNode) {
		var c,pos,
		node = domNode;
	// First check ancestors to see if we're within a popup handle
	while(node && node.getAttribute) {
		// Fetch class
		c = node.getAttribute("class")||"";
		// Find preview popup class
		pos = c.indexOf("tc-preview-tiddler-");
		// Found?
		if(pos > -1) {
			// Cut off at class, and fetch class
			c = c.substr(pos).split(" ")[0];
			return {
				// Return popup level info
				popupLevel: parseInt(c.charAt(c.length-1))
			};
		}
		// Next parent
		node = node.parentNode;
	}
	// No preview popup found? => fetch via core method
	return popupInfoCore.apply(this,arguments);
};

})();