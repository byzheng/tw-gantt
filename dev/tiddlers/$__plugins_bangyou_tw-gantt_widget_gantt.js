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

        var filter = this.getAttribute('filter', '');

        try {

            // whole conatianer for LLM
            let container = document.createElement('div');
            container.classList.add("gantt-container");

            let yearLabelsContainer = document.createElement('div');
            yearLabelsContainer.classList.add("gantt-years");
            container.appendChild(yearLabelsContainer);

            let chartContainer = document.createElement('div');
            chartContainer.classList.add("gantt-chart");
            container.appendChild(chartContainer);


            parent.insertBefore(container, nextSibling);
            // Get all tiddlers tagged as 'Event'
            const events = $tw.wiki.filterTiddlers(filter);

            const startYear = 2017;
            const endYear = 2024;
            const years = endYear - startYear + 1;

            // Gantt Chart Setup
            const containerStyles = window.getComputedStyle(container, null);
            const chartWidth = chartContainer.getBoundingClientRect().width -
                //parseFloat(containerStyles.paddingLeft) -
                parseFloat(containerStyles.paddingRight)
            const pixelsPerYear = chartWidth / years;

            function renderYears(startYear, endYear, yearLabelsContainer, pixelsPerYear) {
                const numYears = endYear - startYear + 1;
                const yearsToDisplay = Math.min(numYears, 10); // Limit to 10 years

                const yearStep = Math.ceil(numYears / yearsToDisplay); // Calculate year skip step

                for (let i = startYear; i <= endYear; i += yearStep) {
                    const yearDiv = document.createElement('div');
                    yearDiv.className = 'gantt-year';
                    yearDiv.style.width = pixelsPerYear + 'px';
                    yearDiv.textContent = i;
                    yearLabelsContainer.appendChild(yearDiv);
                }
            }

            //renderYears(startYear, endYear, yearLabelsContainer, pixelsPerYear);
            // Function to render year labels
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
            function parseDate(dateString) {
                const year = parseInt(dateString.substring(0, 4), 10);
                const month = parseInt(dateString.substring(4, 6), 10) - 1; // Months are 0-based in JavaScript
                const day = parseInt(dateString.substring(6, 8), 10);
                return new Date(year, month, day);
            }
            function calculatePosition(startDate, endDate) {
                const start = parseDate(startDate);
                const end = parseDate(endDate);
                const totalDays = (end - start) / (1000 * 60 * 60 * 24);

                const startYearPos = (start.getFullYear() - startYear) * pixelsPerYear;
                const yearFraction = (start.getMonth() / 12) * pixelsPerYear;

                const barWidth = (totalDays / 365) * pixelsPerYear;
                const position = startYearPos + yearFraction;

                return { position, barWidth };
            }
            // Set container width based on total days
            //container.style.width = `${totalDays * 20}px`;
            events.forEach((eventTitle, index) => {
                const event = $tw.wiki.getTiddler(eventTitle).fields;
                const { position, barWidth } = calculatePosition(event.start, event.end);

                // Create event bar
                const eventBar = document.createElement('div');
                eventBar.className = 'gantt-event';
                eventBar.style.left = position + 'px';
                eventBar.style.width = barWidth + 'px';
                eventBar.style.top = (index * 40) + 'px';
                eventBar.textContent = event.title;

                chartContainer.appendChild(eventBar);
            });



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