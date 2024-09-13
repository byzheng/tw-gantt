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
    

    function ganttChart(events, container, eventTemplate, tooltipTemplate, currentTiddler) {
        if (events.length === 0) {
            container.innerText = "No events";
        }

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

        const startDate = events.reduce((min, event) => event.start < min ? event.start : min, events[0].start);
        const endDate = events.reduce((max, event) => event.end > max ? event.end : max, events[0].end);
        const hasPeople = events.reduce((found, item) => found || item.people !== undefined, false);

        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        const years = endYear - startYear + 1;

        // Calculate chart width 
        let peopleWidth = hasPeople ? 10 : 0;
        const containerStyles = window.getComputedStyle(container, null);
        const chartWidth = 100 - peopleWidth;
        const pixelsPerYear = chartWidth / years;


        //renderYears(startYear, endYear, yearLabelsContainer, pixelsPerYear);
        // Function to render year labels
        if (hasPeople) {
            const peopleDiv = document.createElement('div');
            peopleDiv.className = 'gantt-peoples';
            peopleDiv.style.width = peopleWidth + '%';
            labelsContainer.appendChild(peopleDiv);
        }
        for (let i = startYear; i <= endYear; i++) {
            const yearDiv = document.createElement('div');
            yearDiv.className = 'gantt-label';
            yearDiv.style.width = pixelsPerYear + '%';
            yearDiv.textContent = i;
            labelsContainer.appendChild(yearDiv);
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



    }
    exports.ganttChart = ganttChart;

})();