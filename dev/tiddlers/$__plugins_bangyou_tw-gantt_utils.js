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

    function getDays(start, end) {
        return Math.abs(end - start) / (1000 * 3600 * 24);
    }

    function getMins(start, end) {
        return Math.abs(end - start) / (1000 * 60);
    }

    function getMonthsBetween(startDate, endDate) {
        let months = [];
        let currentDate = new Date(startDate); // Start from startDate

        // Loop through each month between startDate and endDate
        while (currentDate <= endDate) {
            let year = currentDate.getFullYear();
            let month = currentDate.getMonth() + 1; // getMonth() is 0-based, so add 1 to make it 1-based

            // Store year and month in the array
            months.push({
                year: year, month: month,
                name: currentDate.toLocaleString('en-US', { month: 'short' })
            });

            // Move to the next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return months;
    }


    function ganttChart(events, container, eventTemplate, tooltipTemplate, currentTiddler) {
        if (events.length === 0) {
            container.innerText = "No events";
        }
        // for story river
        var openLinkFromInsideRiver = $tw.wiki.getTiddler("$:/config/Navigation/openLinkFromInsideRiver").fields.text;
        var openLinkFromOutsideRiver = $tw.wiki.getTiddler("$:/config/Navigation/openLinkFromOutsideRiver").fields.text;

        var the_story = new $tw.Story({
            wiki: $tw.wiki
        });

        // Create elements for gantt charts
        let labelsContainer = document.createElement('div');
        labelsContainer.classList.add("gantt-labels");
        container.appendChild(labelsContainer);
        let chartContainer = document.createElement('div');
        chartContainer.classList.add("gantt-chart");
        container.appendChild(chartContainer);


        // parse date for start and end
        for (let i = 0; i < events.length; i++) {
            if (events[i].start !== undefined) {
                events[i].start = parseDate(events[i].start);
            }
            if (events[i].end !== undefined) {
                events[i].end = parseDate(events[i].end);
            }
            if (events[i].end < events[i].start) {
                container.innerText = "Event end is earlier than start for " + events[i].title;
                return;
            }
        };

        const startDate = events.reduce((min, event) => event.start < min ? event.start : min, events[0].start);
        const endDate = events.reduce((max, event) => event.end > max ? event.end : max, events[0].end);
        const hasPeople = events.reduce((found, item) => found || item.people !== undefined, false);



        //const years = endYear - startYear + 1;
        let totalDays = getDays(startDate, endDate);
        // calculate the chart types
        let chatType, startChart, endChart;
        let labelIntervals = [];
        if (totalDays > 365) {
            chatType = "years";
            startChart = new Date(startDate.getFullYear(), 0, 1);
            endChart = new Date(endDate.getFullYear(), 0, 1);
            const startYear = startChart.getFullYear();
            const endYear = endChart.getFullYear() + 1;
            for (let i = startYear; i < endYear; i++) {
                labelIntervals.push({
                    start: new Date(i, 0, 1),
                    end: new Date(i, 11, 31),
                    name: i
                })
            }
        } else if (totalDays <= 365 && totalDays > 30) {
            chatType = "months";
            startChart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            endChart = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
            const months = getMonthsBetween(startChart, endChart);
            for (let i = 0; i < months.length - 1; i++) {
                let endMonth = new Date(months[i + 1].year, months[i + 1].month - 1, 1);
                endMonth.setDate(endMonth.getDate() - 1);
                labelIntervals.push({
                    start: new Date(months[i].year, months[i].month - 1, 1),
                    end: endMonth,
                    name: months[i].name
                })
            }
        } else {
            chatType = "days";
            startChart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            //startChart.setDate(startChart.getDate() - 1);
            endChart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            //endChart.setDate(endChart.getDate() + 1);
            let currentDate = new Date(startChart);

            while (currentDate <= endChart) {
                const startCurrentDate = new Date(currentDate);
                const endCurrentDate = new Date(currentDate);
                endCurrentDate.setDate(endCurrentDate.getDate() + 1);
                labelIntervals.push({
                    start: startCurrentDate,
                    end: endCurrentDate,
                    name: startCurrentDate.getDate()
                })
                // Move to the next day
                currentDate.setDate(currentDate.getDate() + 1);
            }

            totalDays = getDays(startChart, endChart) + 1;
        }

        // Calculate chart width 

        let peopleWidth = hasPeople ? 10 : 0;
        const chartWidth = 100 - peopleWidth;
        const pixelsPerDay = chartWidth / totalDays;

        // Function to render year labels
        if (hasPeople) {
            const peopleDiv = document.createElement('div');
            peopleDiv.className = 'gantt-peoples';
            peopleDiv.style.width = peopleWidth + '%';
            labelsContainer.appendChild(peopleDiv);
        }

        function calculatePosition(start, end, pixelsPerDay, center = false) {
            let position;
            if (center) {
                let midDate = new Date((start.getTime() + end.getTime()) / 2);
                position = getDays(startChart, midDate) * pixelsPerDay + peopleWidth;
            } else {
                position = getDays(startChart, start) * pixelsPerDay + peopleWidth;
            }
            const barWidth = getDays(start, end) * pixelsPerDay

            return { position, barWidth };
        }

        for (let i = 0; i < labelIntervals.length; i++) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'gantt-label';
            let { position, barWidth } = calculatePosition(
                labelIntervals[i].start,
                labelIntervals[i].end, pixelsPerDay, true);
            labelDiv.style.left = position + '%';
            labelDiv.style.width = barWidth + '%';
            //labelDiv.style.width = pixelsPerDay * getDays(labelIntervals[i].start, labelIntervals[i].end) + '%';
            labelDiv.textContent = labelIntervals[i].name;
            labelsContainer.appendChild(labelDiv);
        }
        // if (chatType === "years") {
        //     const startYear = startDate.getFullYear();
        //     const endYear = endDate.getFullYear();
        //     for (let i = startYear; i <= endYear; i++) {
        //         const yearDiv = document.createElement('div');
        //         yearDiv.className = 'gantt-label';
        //         yearDiv.style.width = pixelsPerDay * daysInYear(i) + '%';
        //         yearDiv.textContent = i;
        //         labelsContainer.appendChild(yearDiv);
        //     }
        // }


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
                the_story.addToStory(title, currentTiddler, {
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
        const offsetTop = 50;
        events.forEach((event, index) => {
            // position of top
            const top = (index * 40) + offsetTop;
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
                start = startChart;
            }
            if (!isValidDate(end)) {
                end = endChart;
            }
            const { position, barWidth } = calculatePosition(start, end, pixelsPerDay);

            let eventBar = createBar(position, barWidth, top, event.title, event.caption);
            chartContainer.appendChild(eventBar);
        });
        chartContainer.style.height = (events.length * 40) + offsetTop + "px";



    }
    exports.ganttChart = ganttChart;

})();