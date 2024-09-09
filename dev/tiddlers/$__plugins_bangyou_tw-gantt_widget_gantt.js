/*\

Anything LLM in tiddlywiki 5

\*/
(function () {

    /*jslint node: true, browser: true */
    /*global $tw: false */
    "use strict";
    function dateDiffInDays(start, end) {
        const oneDay = 1000 * 60 * 60 * 24;
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.round((endDate - startDate) / oneDay);
    }

    function parseDate(dateString) {
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(4, 6), 10) - 1; // Months are 0-based in JavaScript
        const day = parseInt(dateString.substring(6, 8), 10);
        return new Date(year, month, day);
    }
    function isValidDate(d) {
        return d instanceof Date && !isNaN(d);
    }

    if ($tw.browser) {

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

        // whole conatianer
        let container = document.createElement('div');
        container.classList.add("gantt-container");
        parent.insertBefore(container, nextSibling);

        var filter = this.getAttribute('filter', '');
        if (filter == "") {
            container.innerHTML = "filter is empty."
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
            let eventsTiddlers = $tw.wiki.filterTiddlers(filter);
            if (eventsTiddlers.length === 0) {
                container.innerText = "no events are found.";
            }
            let events = [];
            for (let i = 0; i < eventsTiddlers.length; i++) {
                const event = $tw.wiki.getTiddler(eventsTiddlers[i]);
                let start, end, name, title, people;
                if (event.fields.start !== undefined) {
                    start = parseDate(event.fields.start);
                    if (start.getFullYear() < startYear) {
                        startYear = start.getFullYear();
                    }
                }
                if (event.fields.end !== undefined) {
                    end = parseDate(event.fields.end);
                    if (end.getFullYear() > endYear) {
                        endYear = end.getFullYear();
                    }
                }
                if (event.fields.caption !== undefined) {
                    name = event.fields.caption;
                } else {
                    name = event.fields.title;
                }
                if (event.fields.people !== undefined) {
                    people = $tw.utils.parseStringArray("" + event.fields.people, true);
                }
                title = event.fields.title;
                events.push({
                    start: start,
                    end: end,
                    name: name,
                    title: title
                })
            };



            const years = endYear - startYear + 1;

            // Gantt Chart Setup
            const peopleWidth = 150;
            const containerStyles = window.getComputedStyle(container, null);
            const chartWidth = chartContainer.getBoundingClientRect().width -
                //parseFloat(containerStyles.paddingLeft) -
                parseFloat(containerStyles.paddingRight) - peopleWidth;
            const pixelsPerYear = chartWidth / years;


            //renderYears(startYear, endYear, yearLabelsContainer, pixelsPerYear);
            // Function to render year labels
            const peopleDiv = document.createElement('div');
            peopleDiv.className = 'gantt-people';
            peopleDiv.style.width = peopleWidth + 'px';
            yearLabelsContainer.appendChild(peopleDiv);
            for (let i = startYear; i <= endYear; i++) {
                const yearDiv = document.createElement('div');
                yearDiv.className = 'gantt-year';
                yearDiv.style.width = pixelsPerYear + 'px';
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
                const yearFraction = (start.getMonth() / 12) * pixelsPerYear;

                const barWidth = (totalDays / 365) * pixelsPerYear;
                const position = peopleWidth + startYearPos + yearFraction;

                return { position, barWidth };
            }
            // Set container width based on total days
            //container.style.width = `${totalDays * 20}px`;
            events.forEach((event, index) => {
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

                // Create event bar
                const eventBar = document.createElement('div');
                eventBar.className = 'gantt-event';
                eventBar.style.left = position + 'px';
                eventBar.style.width = barWidth + 'px';
                eventBar.style.top = (index * 40) + 'px';
                // create a link to tiddler
                let dom_link = document.createElement('a');
                dom_link.classList.add("tiddler-link");
                dom_link.classList.add("tc-tiddlylink");
                dom_link.classList.add("tc-tiddlylink-resolves");
                dom_link.setAttribute("href", "#" + encodeURIComponent(event.title));
                dom_link.innerText = event.title;
                dom_link.addEventListener("click", function (e) {
                    e.preventDefault();
                    the_story.addToStory(event.title, current_tiddler, {
                        openLinkFromInsideRiver: openLinkFromInsideRiver,
                        openLinkFromOutsideRiver: openLinkFromOutsideRiver
                    });
                    the_story.addToHistory(event.title);
                });

                eventBar.appendChild(dom_link);

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
    MyWidget.prototype.refresh = function (changedTiddlers) { };

    exports.gantt = MyWidget;

})();