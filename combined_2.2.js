/***********************************************
knockout js Neighborhood Map

Udacity

author: Myles Callan

map functionality, api query, and searchable menu
************************************************/
// Declare info window content
var content = '';
// Declare Map variable and markers array
var map;
var infoWindow;
var marker;


// Create method to search strings:
ko.utils.stringStartsWith = function(string, startsWith) {
    string = string || "";
    if (startsWith.length > string.length)
        return false;
    return string.substring(0, startsWith.length) === startsWith;
};

/***********************************************
// 1. Data Preparation:
***********************************************/
// a. Create the observerable function:
var Liverpool = function(data) {
    this.opponent = ko.observable(data.opponent);
    this.month = ko.observable(data.month);
    this.date = ko.observable(data.date);
    this.time = ko.observable(data.time);
    this.location = ko.observable(data.location);
    this.home = ko.observable(data.home);
    this.link = ko.observable(data.link);
    this.stadium = ko.observable(data.stadium);
};

// b. Extract the data (from fixturesStadia) needed:
var Games = [];
var teams = []
for (i = 0; i < fixturesStadia.length; i++) {
    // Create instances of new cats
    Games.push({
        opponent: fixturesStadia[i].Opponent,
        month: fixturesStadia[i].Month,
        date: fixturesStadia[i].Day + ', ' + fixturesStadia[i].Date + ' ' + fixturesStadia[i].Month + ' ' + fixturesStadia[i].Year,
        time: fixturesStadia[i].Time,
        location: fixturesStadia[i].Location,
        home: fixturesStadia[i].Home,
        link: fixturesStadia[i]['Club profile'],
        stadium: fixturesStadia[i].Stadium
    });
    teams.push(fixturesStadia[i].Opponent)
}

/***********************************************
// 3. View Model
***********************************************/
function ViewModel() {
    var self = this;
    self.markers = [];

    // a. Create Observable Array
    self.gameList = ko.observableArray([]);
    Games.forEach(function(gameItem) {
        // console.log(catItem.name);
        self.gameList.push(new Liverpool(gameItem));
    });

    // b. Extract Current Game
    self.currentGame = ko.observable(this.gameList()[0]);
    self.setGame = function(game) {
        self.currentGame(game);
    };

    // c. synchronous query: Team Sheets
    var firstResponse = aJaxCall('http://api.football-data.org/v1/teams/64/fixtures').done(function(response) {
        return response;
    }).fail(console.log('error'));

    if (typeof firstResponse != 'undefined') {
        var response = firstResponse.responseJSON;
        var teamLinks = {};
        var teamNames = {};
        response.fixtures.forEach(function(d) {
            teamLinks[d.awayTeamName] = d._links.awayTeam.href;
            teams.forEach(function(e) {
                var regex = new RegExp(e.toLowerCase());
                var awayTeam = d.awayTeamName.toLowerCase();
                if (regex.test(awayTeam)) {
                    teamNames[e] = d.awayTeamName;
                }
            })
        });
    }
    var teamPlayers = {}
    for (var key in teamLinks) {
        aJaxCall(teamLinks[key] + '/players').done(function(response) {
            var temp = [];
            response.players.forEach(function(d) {
                var tempObj = {};
                tempObj['jerseyNumber'] = d.jerseyNumber;
                tempObj['name'] = d.name;
                tempObj['position'] = d.position;
                temp.push(tempObj);
            })
            teamPlayers[key] = temp;
        })
    }

    // c. Markers
    // c.i. Initialize objects for markers
    var infoWindow = new google.maps.InfoWindow();
    var myIcon = new google.maps.MarkerImage("images/liverpool_marker.png", null, null, null, new google.maps.Size(51, 60));
    var pinIcon = new google.maps.MarkerImage("images/pin.png", null, null, null, new google.maps.Size(31, 40));

    // c.ii. Add new markers at each location in the gameList observables:
    self.gameList().forEach(function(location) {
        // extract the coordinates:
        var position = {};
        position.lat = parseFloat(location.location().lat);
        position.lng = parseFloat(location.location().lng);

        var titleII = location.opponent();

        marker = new google.maps.Marker({
            position: position,
            map: map,
            title: titleII,
            icon: pinIcon,
            animation: google.maps.Animation.DROP
        });
        marker.addListener('click', function() {
            // Info Window for each marker
            populateInfoWindow(this, location, infoWindow);

            // Team Sheets for each marker
            if (typeof teamPlayers != 'undefined') {

                document.getElementById('homePlayersDiv').style.display = 'inline';
                document.getElementById('awayPlayersDiv').style.display = 'inline';

                var htmlOpponent = teamPlayers[teamNames[location.opponent()]].map(function(element) {
                    return '<span class="jNumber"><a href="#">' + element.jerseyNumber + ':</span> ' + element.name + '<span class="position">(' + element.position + ')</span>  </a>';
                }).join('');

                var htmlLiverpool = teamPlayers['Liverpool FC'].map(function(element) {
                    return '<span class="jNumber"><a href="#">' + element.jerseyNumber + ':</span> ' + element.name + '<span class="position">(' + element.position + ')</span>  </a>';
                }).join('');

                htmlOpponent += '<a href="#"><span class="citation"><br/>Team Sheet Provided By: api.football-data.org</span>  </a>'

                htmlLiverpool += '<a href="#"><span class="citation"><br/>Team Sheet Provided By: api.football-data.org</span>  </a>'

                if (location.home() === 'H') {
                    document.getElementById('homePlayers').innerHTML = htmlLiverpool;
                    document.getElementById('awayPlayers').innerHTML = htmlOpponent;
                } else {
                    document.getElementById('homePlayers').innerHTML = htmlOpponent;
                    document.getElementById('awayPlayers').innerHTML = htmlLiverpool;
                }
            } else {
                // Error method to be run if request fails
                if (location.home() === 'H') {
                    document.getElementById('homePlayers').innerHTML = "I'm sorry, an error has occurred. Please try again later.";
                    document.getElementById('awayPlayers').innerHTML = "I'm sorry, an error has occurred. Please try again later.";
                } else {
                    document.getElementById('homePlayers').innerHTML = "I'm sorry, an error has occurred. Please try again later.";
                    document.getElementById('awayPlayers').innerHTML = "I'm sorry, an error has occurred. Please try again later.";
                }
            }
        });
        marker.addListener('mouseover', function() {
            this.setIcon(myIcon);
        });
        marker.addListener('mouseout', function() {
            this.setIcon(pinIcon);
        });

        location.marker = marker;
    });

    // d. Add eventlistener for clicks on item in list view
    self.gamesSelect = function(game) {
        google.maps.event.trigger(game.marker, 'click'); //Associate the marker with the list view item when clicked
        if (this.opponent) {
            map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
            map.setZoom(18); //Zoom the map
            map.panTo(game.marker.position);
            game.marker.setAnimation(google.maps.Animation.BOUNCE); // Cause markers to bounce when clicked
        }
        setTimeout(function() {
            game.marker.setAnimation(null); // End marker animation after 2 seconds 
        }, 2000);

    }

    // e. Toggle Full Scale Map, extending bounds to full map
    function showGames() {
        if (infoWindow) {
            infoWindow.close();
        }
        var bounds = new google.maps.LatLngBounds();
        // extend the bounds and set the markers
        self.gameList().forEach(function(location) {
            marker.setMap(map);
            bounds.extend(location.marker.position);
        });
        map.setMapTypeId(google.maps.MapTypeId.HYBRID);
        map.fitBounds(bounds);
    }


    // f. Anfield Map
    function hideGames() {
        map.setZoom(19); //Zoom the map
        map.panTo({
            lat: 53.4308,
            lng: -2.9608
        });
        map.setMapTypeId(google.maps.MapTypeId.HYBRID);
    }

    // f. Searchable List
    self.nameSearch = ko.observable('');
    self.monthSearch = ko.observable('');
    self.filteredRecords = ko.computed(function() {
        return ko.utils.arrayFilter(self.gameList(), function(r) {
            var match = (self.monthSearch().length == 0 || ko.utils.stringStartsWith(r.month().toLowerCase(), self.monthSearch().toLowerCase())) && (self.nameSearch().length == 0 || ko.utils.stringStartsWith(r.opponent().toLowerCase(), self.nameSearch().toLowerCase()))
            if (match) {
                //If result is true, show correct marker based off users search
                r.marker.setVisible(true);
            } else {
                //hide markers that do not show users search results
                r.marker.setVisible(false);
            }
            return match;
        });
    });


    // f. function to population Info Window for each marker
    function populateInfoWindow(marker, location, infoWindow) {
        var footballDataURL = 'http://api.football-data.org/v1/teams/64/fixtures';
        if (infoWindow.marker != marker) {
            infoWindow.setContent('');
            infoWindow.marker = marker;
            infoWindow.addListener('closeclick', function() {
                infoWindow.marker = null;
            });
            var streetViewService = new google.maps.StreetViewService();
            var radius = 200;
            // asynchronous query: api.football-data.org
            // Match Data
            $.ajax({
                headers: {
                    'X-Auth-Token': '99aa091bd9f04c89a832bc063e789e10'
                },
                url: footballDataURL,
                dataType: 'json',
                type: 'GET',
                success: function(response) {

                    var titleI = '<div class="iw-title"><b>' + location.opponent() + ' (' + location.home() + ')</b><br/><span class="panoInstruction" style="color:white;font-size:12px";>Click on Image and Use Arrow Keys To View:  ' + location.stadium() + '</span></div> <div class="infoHeaderContainer"> <div class="infoHeaderLeft"><span class="modalLinkText" style="color:#C31014; text-shadow: 1px 1px #800000;";><a href="' + location.link() + '" target="_blank">Home Team Website </a></span><br/><b> ' + location.stadium() + '</b><br/>' + location.time() + ', ' + location.date() + '</div>'
                    titleI += information(location, response) + ' </div><span class="citation"><em>(Details Provided By: api.football-data.org)</em></span>';

                    // asynchronous query: google.maps.StreetViewStatus
                    // Add Panorama to infoWindow: 
                    function getStreetView(data, status) {
                        if (status == google.maps.StreetViewStatus.OK) {
                            var nearStreetViewLocation = data.location.latLng;
                            var heading = google.maps.geometry.spherical.computeHeading(nearStreetViewLocation, marker.position);
                            infoWindow.setZIndex(1000);
                            infoWindow.set('id', 'markerContent');
                            infoWindow.setContent('<div id="iw-container">' + titleI + '</div>' + '<br>' + '<div id="pano">' + '</div>');
                            var panoramaOptions = {
                                position: nearStreetViewLocation,
                                pov: {
                                    heading: heading,
                                    pitch: 10
                                }
                            };
                            var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'), panoramaOptions);
                        } else {
                            infoWindow.setContent('<div>' + titleI + '</div><div>No Street View Found</div>');
                        }
                    }
                    streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);

                    infoWindow.open(map, marker);

                }, // Error method to be run if request fails
                error: function(footballDataURL, errorMsg) {
                    setTimeout(function() { // Display error after 2 seconds if Request to API fails
                        if (errorMsg) {
                            infoWindow.setContent("I'm sorry, an error has occurred. Please try again later.");
                            infoWindow.open(map, location.marker);
                        }
                    }, 2000);
                }
            });
        }
    }

    // g. Extract Opponent Information from API
    function information(location, response) {
        var regex = new RegExp(location.opponent().toLowerCase());
        for (let d of response.fixtures) {
            var homeTeam = d.homeTeamName.toLowerCase();
            var awayTeam = d.awayTeamName.toLowerCase();

            if (location.opponent().toLowerCase().indexOf('brighton') !== -1) {
                console.log(location.opponent().toLowerCase());
            }
            if (location.home() == 'A') {

                if (regex.test(homeTeam)) {
                    text = '<div class="infoHeaderLeft">' + 'Away Result: ' +
                        d.homeTeamName + ' vs. ' + d.awayTeamName + '<br/>' + 'Status: ' + d.status + '<br/>' + 'Final Score: ' + d.result.goalsHomeTeam + ':' + d.result.goalsAwayTeam + '</div>';
                    break;
                }
            } else {
                if (regex.test(awayTeam)) {
                    text = '<div class="infoHeaderLeft">' + 'Home Result: ' +
                        d.homeTeamName + ' vs. ' + d.awayTeamName + '<br/>' + 'Status: ' + d.status + '<br/>' + 'Final Score: ' + d.result.goalsHomeTeam + ':' + d.result.goalsAwayTeam + '</div>';
                    break;
                }
            }
        }
        return text;
    }
    // h. create list from object
    function formatParams(params) {
        return params.map(function(param) {
            return param.param + ':' + param.childParam;
        }).join(', ');
    }

    // i. synchronous query function
    function aJaxCall(url) {
        return $.ajax({
            headers: {
                'X-Auth-Token': '99aa091bd9f04c89a832bc063e789e10'
            },
            url: url,
            dataType: 'json',
            async: false,
            type: 'GET'
        });
    }

    // j. re-center map
    var getCen = map.getCenter();

    //Use event listener for resize on window
    google.maps.event.addDomListener(window, 'resize', function() {
        //Set Center
        map.setCenter(getCen);
    });

    // k. Show games and attach events to buttons
    showGames()
    document.getElementById('show-games').addEventListener('click', showGames);
    document.getElementById('hide-games').addEventListener('click', hideGames);

    return self;
};

//Create Instance of a map from the Google maps api
//Grab the reference to the "map" id to display map
//Set the map options object properties
function initMap() {
    var redMapType = new google.maps.StyledMapType(mapStylesRed, {
        name: "Reds' Style"
    });
    var brownMapType = new google.maps.StyledMapType(mapStylesBrown, {
        name: "Myles' Style"
    });
    var bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(49.383639452689664, -17.39866406249996),
        new google.maps.LatLng(59.53530451232491, 8.968523437500039));
    map = new google.maps.Map(document.getElementById("map"), {
            center: {
                lat: 53.4308,
                lng: -2.9608
            },
            zoom: 19,
            // bounds: bounds,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, 'brownMapType', 'redMapType']
            },
            mapTypeControl: true
        })
        //Apply viewmodel via knockout
    ko.applyBindings(ViewModel());
};
