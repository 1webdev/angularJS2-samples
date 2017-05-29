import {Component, ViewChild, ElementRef} from '@angular/core';
import {Platform, App, AlertController} from 'ionic-angular';
import {Geolocation} from 'ionic-native';
import {DefaultService} from '../../services/default.service';
import {UserService} from '../../services/user.service';
import {RequestService} from '../../services/request.service';
import {Storage} from '@ionic/storage';
import {Login} from '../login/login';

declare var google;


@Component({
    selector: 'find-me',
    templateUrl: 'find-me.html',
    providers: [DefaultService, UserService, RequestService]
})
export class FindMe {

    @ViewChild('map') mapElement: ElementRef;
    map: any;

    lat: number;
    lng: number;
    address: string;

    constructor(
        public platform: Platform,
        public defaultSvc: DefaultService,
        public userSvc: UserService,
        public storage: Storage,
        public app: App,
        public alertCtrl: AlertController
    ) {
        platform.ready().then(() => {
            this.locateMyPosition();
        });
    }

    locateMyPosition() {
        this.defaultSvc.showLoading();
        this._getCurrentPosition().then((result: any) => {
            if (result && !result.lat && !result.lng) {
                this.defaultSvc.hideLoading();
                return false;
            }
            this.defaultSvc.hideLoading();
            this._loadMap(result);
        }).catch((err: any) => {
            this.defaultSvc.hideLoading();
            return;
        });
    }

    sendForHelp() {

        if (!this.lat || !this.lng) {
            this.defaultSvc.showToastWithCloseButton('Please enable geolocation module and try again', 'Close', 'middle', false);
            return;
        }

        let googleMapUrl = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + this.lat + ',' + this.lng + '&sensor=true';
        this.userSvc.getAdressLocation(googleMapUrl).then((response: any) => {

            this.address = response.results && response.results[0] && response.results[0].formatted_address ? response.results[0].formatted_address : false;
            if (!this.address) {
                this.defaultSvc.showToastWithCloseButton('Please enable geolocation module and try again', 'close', 'middle', false);
                return;
            }

            this.storage.get('user').then((response => {
                if (!response || !response.userID) {
                    this.app.getRootNav().setRoot(Login);
                }
                let userID = response.userID;
                let dataToSend = {latitude: this.lat, longitude: this.lng, user_id: userID, address: this.address};
                this.userSvc.addFindMe(dataToSend).then((response: any) => {
                    if (response.result) {
                        this.defaultSvc.showToastWithCloseButton('We have informed your leader of your location.', 'close', 'middle', false);
                        return;
                    }
                });

            }));
        }).catch((error: any) => {
            this.defaultSvc.hideLoading();
            this.defaultSvc.showToastWithCloseButton('Error, please check connection to internet.', 'Close', 'middle', false);
            return;
        });
    }


    showConfirm(photoToRemove: any) {

        let confirm = this.alertCtrl.create({
            title: 'Send for help',
            message: 'Are you sure?',
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Send',
                    handler: () => {
                        this.sendForHelp();
                    }
                }
            ]
        });
        confirm.present();
    }


    private _loadMap(coordinates: any) {
        this.defaultSvc.showLoading();
        if (!coordinates) {
            this.defaultSvc.hideLoading();
            alert('error get coordinates');
            return;
        }

        this.lat = coordinates.lat;
        this.lng = coordinates.lng;

        let itemLatLng = new google.maps.LatLng(this.lat, this.lng);
        let mapOptions = {
            center: itemLatLng,
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        let mapDiv = document.getElementById("map");
        this.map = new google.maps.Map(mapDiv, mapOptions);
        this.defaultSvc.hideLoading();
        this._addMarker();
    }

    private _addMarker() {
        this.defaultSvc.showLoading();
        let marker = new google.maps.Marker({
            map: this.map,
            animation: google.maps.Animation.DROP,
            position: this.map.getCenter()
        });

        let content = "<h4>My Current Position!</h4>";
        this.defaultSvc.hideLoading();
        this._addInfoWindow(marker, content);
    }

    private _addInfoWindow(marker, content) {
        let infoWindow = new google.maps.InfoWindow({
            content: content
        });

        google.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(this.map, marker);
        });
    }

    private _getCurrentPosition() {
        var options = {
            timeout: 5000,
        };
        return Geolocation.getCurrentPosition(options).then((resp) => {
            return {lat: resp.coords.latitude, lng: resp.coords.longitude};
        }).catch((error: any) => {
            this.defaultSvc.showToastWithCloseButton('Please enable geolocation module and try again', 'Close', 'middle', false);
            return error;
        });
    }

}
