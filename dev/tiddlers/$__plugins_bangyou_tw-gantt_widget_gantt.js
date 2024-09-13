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
            // Create elements for gantt charts
            let yearLabelsContainer = document.createElement('div');
            yearLabelsContainer.classList.add("gantt-years");
            container.appendChild(yearLabelsContainer);

            let chartContainer = document.createElement('div');
            chartContainer.classList.add("gantt-chart");
            container.appendChild(chartContainer);



            // Get all tiddlers from filter
            // Check field start and end
            // get start and end years
            let startYear = 9999;
            let endYear = -9999;
            this.eventsTiddlers = this.wiki.filterTiddlers(filter, this);

            if (this.eventsTiddlers.length === 0) {
                container.innerText = "no events are found.";
            }
            let ignore_people = true;
            let events = [];
            for (let i = 0; i < this.eventsTiddlers.length; i++) {
                const event = $tw.wiki.getTiddler(this.eventsTiddlers[i]);
                let start, end, caption, title, people;
                if (event.fields[startField] !== undefined) {
                    start = parseDate(event.fields[startField]);
                    if (start.getFullYear() < startYear) {
                        startYear = start.getFullYear();
                    }
                }
                if (event.fields[endField] !== undefined) {
                    end = parseDate(event.fields[endField]);
                    if (end.getFullYear() > endYear) {
                        endYear = end.getFullYear();
                    }
                }
                if (event.fields.caption !== undefined) {
                    caption = event.fields.caption;
                } else {
                    caption = event.fields.title;
                }
                if (event.fields[peopleField] !== undefined) {
                    people = $tw.utils.parseStringArray("" + event.fields[peopleField], true);
                    ignore_people = false;
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



            const years = endYear - startYear + 1;

            // Gantt Chart Setup
            let peopleWidth = 10;
            if (ignore_people) {
                peopleWidth = 0;
            }
            const containerStyles = window.getComputedStyle(container, null);
            // const chartWidth = chartContainer.getBoundingClientRect().width -
            //     //parseFloat(containerStyles.paddingLeft) -
            //     parseFloat(containerStyles.paddingRight) - peopleWidth;
            const chartWidth = 100 - peopleWidth;
            const pixelsPerYear = chartWidth / years;


            //renderYears(startYear, endYear, yearLabelsContainer, pixelsPerYear);
            // Function to render year labels
            if (!ignore_people) {
                const peopleDiv = document.createElement('div');
                peopleDiv.className = 'gantt-peoples';
                peopleDiv.style.width = peopleWidth + '%';
                yearLabelsContainer.appendChild(peopleDiv);
            }
            for (let i = startYear; i <= endYear; i++) {
                const yearDiv = document.createElement('div');
                yearDiv.className = 'gantt-year';
                yearDiv.style.width = pixelsPerYear + '%';
                yearDiv.textContent = i;
                yearLabelsContainer.appendChild(yearDiv);
            }

            // Variables for timeline calculation
            // const minDate = new Date(Math.min(...events.map(eventTitle => new Date(.fields.start))));
            // const maxDate = new Date(Math.max(...events.map(eventTitle => new Date($tw.wiki.getTiddler(eventTitle).fields.end))));
            // const totalDays = dateDiffInDays(minDate, maxDate);

            function calculatePosition(start, end) {
                // const start = parseDate(startDate);
                // const end = parseDate(endDate);
                const totalDays = (end - start) / (1000 * 60 * 60 * 24);

                const startYearPos = (start.getFullYear() - startYear) * pixelsPerYear;
                const dayOfYear = Math.floor((start - new Date(start.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
                const yearFraction = (dayOfYear / 365) * pixelsPerYear;

                //const yearFraction = (start.getMonth() / 12) * pixelsPerYear;

                const barWidth = (totalDays / 365) * pixelsPerYear;
                const position = peopleWidth + startYearPos + yearFraction;

                return { position, barWidth };
            }
            function tiddlerLink(title, caption = title) {
                let dom_link = document.createElement('a');
                dom_link.classList.add("tiddler-link");
                dom_link.classList.add("tc-tiddlylink");
                if ($tw.wiki.tiddlerExists(title)) {
                    dom_link.classList.add("tc-tiddlylink-resolves");
                } else {
                    dom_link.classList.add("tc-tiddlylink-missing");
                }
                dom_link.setAttribute("href", "#" + encodeURIComponent(title));
                dom_link.innerText = caption;
                dom_link.addEventListener("click", function (e) {
                    e.preventDefault();
                    the_story.addToStory(title, current_tiddler, {
                        openLinkFromInsideRiver: openLinkFromInsideRiver,
                        openLinkFromOutsideRiver: openLinkFromOutsideRiver
                    });
                    the_story.addToHistory(title);
                });
                return dom_link
            }
            function createBar(position, barWidth, top, title, caption = title, className = "gantt-event") {
                // Create event bar
                const eventBar = document.createElement('div');
                eventBar.className = className;
                eventBar.style.left = position + '%';
                eventBar.style.width = barWidth + '%';
                eventBar.style.top = top + 'px';
                if (eventTemplate === "") {
                    // create a link to tiddler
                    const dom_link = tiddlerLink(title, caption);
                    eventBar.appendChild(dom_link);
                } else {
                    let event_html = $tw.wiki.renderTiddler("text/html", eventTemplate,
                        { variables: { currentTiddler: title } }
                    );
                    event_html = event_html.replace("<p>", "");
                    event_html = event_html.replace("</p>", "");
                    eventBar.innerHTML = event_html;
                }
                

                // Create a tooltip
                const tooltip = document.createElement('div');
                tooltip.className = "gantt-tooltip";
                if (tooltipTemplate === "") {
                    const tooltip_link = tiddlerLink(title, caption);
                    tooltip.appendChild(tooltip_link);
                } else {
                    const tooltip_html = $tw.wiki.renderTiddler("text/html", tooltipTemplate,
                        { variables: { currentTiddler: title } }
                    );
                    tooltip.innerHTML = tooltip_html;
                }
                let hideTimeout;
                function showTooltip(event) {
                    tooltip.style.display = 'block';
                    tooltip.style.top = (event.clientY) + 'px';
                    tooltip.style.left = (event.clientX + 10) + 'px';
                    clearTimeout(hideTimeout); // Cancel any pending hide operations
                }

                // Function to hide tooltip
                function hideTooltip() {
                    tooltip.style.display = 'none';
                }


                eventBar.addEventListener('mouseenter', function (event) {
                    showTooltip(event);
                });

                eventBar.addEventListener('mouseleave', function () {
                    hideTimeout = setTimeout(() => {
                        hideTooltip();
                    }, 500);
                });

                tooltip.addEventListener('mouseenter', function () {
                    clearTimeout(hideTimeout); // Cancel hide if entering tooltip
                });

                // Hide tooltip when mouse leaves the tooltip
                tooltip.addEventListener('mouseleave', function () {
                    hideTooltip();
                });

                const element = document.createElement('div');
                element.appendChild(eventBar);
                element.appendChild(tooltip);

                return element;
            }



            // Set container width based on total days
            //container.style.width = `${totalDays * 20}px`;
            events.forEach((event, index) => {
                // position of top
                const top = (index * 40);
                // Add people
                if (event.people !== undefined) {
                    event.people.forEach((people, index) => {
                        const position = peopleWidth * index / event.people.length;
                        const width = peopleWidth / event.people.length;
                        let peopleBar = createBar(position, width, top, people, people, "gantt-people");
                        chartContainer.appendChild(peopleBar);
                    });
                }
                let start = event.start;
                let end = event.end;
                // If mising start or end assume from start to end years
                if (!isValidDate(start)) {
                    start = new Date(startYear, 0, 1);
                }
                if (!isValidDate(end)) {
                    end = new Date(endYear, 11, 31);
                }
                const { position, barWidth } = calculatePosition(start, end);

                let eventBar = createBar(position, barWidth, top, event.title, event.caption);
                chartContainer.appendChild(eventBar);
            });
            chartContainer.style.height = (events.length * 40) + "px";



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