/*\

Gantt Chart in tiddlywiki 5

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";
    function parseDate(dateString) {
        if (isValidDate(dateString)) {
            return dateString;
        }
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(4, 6), 10) - 1; // Months are 0-based in JavaScript
        const day = parseInt(dateString.substring(6, 8), 10);
        return new Date(year, month, day);
    }
    function isValidDate(d) {
        return d instanceof Date && !isNaN(d);
    }

    var Widget = require("$:/core/modules/widgets/widget.js").widget;
    var ganttChart = require("$:/plugins/bangyou/tw-gantt/utils.js").ganttChart;

    var MyWidget = function (parseTreeNode, options) {
        this.initialise(parseTreeNode, options);
    };

    /*
    Inherit from the base widget class
     */
    MyWidget.prototype = new Widget();

    // Render this widget into the DOM
    MyWidget.prototype.render = function (parent, nextSibling) {
        this.parentDomNode = parent;
        this.computeAttributes();
        var openLinkFromInsideRiver = $tw.wiki.getTiddler("$:/config/Navigation/openLinkFromInsideRiver").fields.text;
        var openLinkFromOutsideRiver = $tw.wiki.getTiddler("$:/config/Navigation/openLinkFromOutsideRiver").fields.text;
        var current_tiddler = this.getAttribute("tiddler", this.getVariable("currentTiddler"));
        var the_story = new $tw.Story({
            wiki: $tw.wiki
        });
        this.uuid = (Math.random() + 1).toString(36).substring(3);
        let container = document.createElement('div');
        container.classList.add("gantt-container");
        container.id = this.uuid;
        parent.insertBefore(container, nextSibling);

        var filter = this.getAttribute('filter', '');
        if (filter == "") {
            container.innerHTML = "filter is empty."
        }
        this.filter = filter;
        var startField = this.getAttribute('start', 'start');
        var endField = this.getAttribute('end', 'end');
        var peopleField = this.getAttribute('people', 'people');
        var tooltipTemplate = this.getAttribute('tooltipTemplate', '');
        if (tooltipTemplate !== "" && !$tw.wiki.tiddlerExists(tooltipTemplate)) {
            tooltipTemplate = "";
        }
        var eventTemplate = this.getAttribute('eventTemplate', '');
        if (eventTemplate !== "" && !$tw.wiki.tiddlerExists(eventTemplate)) {
            eventTemplate = "";
        }
        try {
            // Get all tiddlers from filter
            // Check field start and end
            this.eventsTiddlers = this.wiki.filterTiddlers(filter, this);

            if (this.eventsTiddlers.length === 0) {
                container.innerText = "no events are found.";
            }
            // Get all events
            let events = [];
            for (let i = 0; i < this.eventsTiddlers.length; i++) {
                const event = $tw.wiki.getTiddler(this.eventsTiddlers[i]);
                let start, end, caption, title, people;
                if (event.fields[startField] !== undefined) {
                    start = parseDate(event.fields[startField]);
                }
                if (event.fields[endField] !== undefined) {
                    end = parseDate(event.fields[endField]);
                }
                if (event.fields.caption !== undefined) {
                    caption = event.fields.caption;
                } else {
                    caption = event.fields.title;
                }
                if (event.fields[peopleField] !== undefined) {
                    people = $tw.utils.parseStringArray("" + event.fields[peopleField], true);
                }
                title = event.fields.title;
                events.push({
                    start: start,
                    end: end,
                    caption: caption,
                    title: title,
                    people: people
                })
            };
            ganttChart(events, container, eventTemplate, tooltipTemplate);

        } catch (e) {
            console.log(e)
        }
    };

    /*
    Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
     */
    MyWidget.prototype.refresh = function (changedTiddlers) {
        // skip if draft, temp, state tiddlers
        let non_normal_count = 0;
        for (let key in changedTiddlers) {
            // if in the editing mode
            if (key.startsWith("Draft of ")) {
                non_normal_count++;
                continue;
            }
            // if system tiddler
            if ($tw.wiki.isSystemTiddler(key)) {
                non_normal_count++;
                continue;
            }
        }
        // return if all tiddlers are system or draft
        if (non_normal_count === Object.keys(changedTiddlers).length) {
            return false;
        }

        var changedAttributes = this.computeAttributes();
        var newEventsTiddlers = this.wiki.filterTiddlers(this.filter, this);
        if (newEventsTiddlers.length !== this.eventsTiddlers.length) {
            is_changed_tiddler = true;
        } else {
            var is_changed_tiddler = false;
            for (let i = 0; i < this.eventsTiddlers.length; i++) {
                if (changedTiddlers[this.eventsTiddlers[i]]) {
                    is_changed_tiddler = true;
                    break;
                }
            }
        }
        if (changedAttributes.filter || changedAttributes.start ||
            changedAttributes.end || changedAttributes.people ||
            is_changed_tiddler) {
            // destory old on
            if (this.uuid) {
                var element = document.getElementById(this.uuid);
                element.parentNode.removeChild(element);
            }
            this.refreshSelf();
            return true;
        } else {
            return false;
        }
    };

    exports.gantt = MyWidget;

})();