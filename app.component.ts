import {Component, ViewChild} from '@angular/core';
import {Events, MenuController, Nav, Platform} from 'ionic-angular';
import {Splashscreen} from 'ionic-native';
import {Storage} from '@ionic/storage';
import {Camera, Push, Device} from 'ionic-native';

/* Pages without menu */
import {Login} from '../pages/login/login';

/* Pages with menu */
import {Schedule} from '../pages/schedule/schedule';
import {ExchangeTrips} from '../pages/exchange-trips/exchange-trips';
//import {PhoneBook} from '../pages/phone-book/phone-book';
import {Settings} from '../pages/settings/settings';

/* Import Services */
import {RequestService} from '../services/request.service';
import {DefaultService} from '../services/default.service';
import {UsersService} from '../services/users.service';
import {AuthService} from '../services/auth.service';


export interface PageInterface {
    title: string;
    component: any;
    icon: string;
    logsOut?: boolean;
    index?: number;
    tabComponent?: any;
}

@Component({
    templateUrl: 'app.template.html',
    providers: [RequestService, DefaultService, UsersService, AuthService]
})
export class App {
    @ViewChild(Nav) nav: Nav;

    appPages: PageInterface[] = [
        {title: 'Schedule', component: Schedule, icon: 'car'},
        {title: 'Exchange Trips', component: ExchangeTrips, icon: 'people'},
        //{title: 'PhoneBook', component: PhoneBook, icon: 'book'},
        {title: 'Logout', component: '', icon: 'log-out', logsOut: true},

    ];
    rootPage: any;
    user: any = {};

    constructor(
        public events: Events,
        public menu: MenuController,
        public platform: Platform,
        public storage: Storage,
        public defaultSvc: DefaultService,
        public usersSvc: UsersService,
        public authSvc: AuthService,
        //public navCtrl: NavController
    ) {

        events.subscribe('user:created', (user: boolean) => {
            if (user) {
                this.getUser();
                this.addDevice();
            }
        });

        this.storage.get('token').then((hasToken) => {
            if (hasToken) {
                this.rootPage = Schedule;
            } else {
                this.rootPage = Login;
            }
            this.platformReady();
        });
    }



    ngOnInit() {
        this.storage.get('token').then((hasToken: any) => {
            if (hasToken) {
                this.getUser();
                this.addDevice();
            }
        });
    }

    getUser() {
        this.usersSvc.getUser({}).then((response: any) => {
            if (response && response.status == 'OK') {
                this.user = response.user;
                return;
            }
        }).catch((error: any) => {});
    }

    addDevice() {
        this.platform.ready().then(() => {
            if (!this.platform.is('cordova')) {
                console.log("Push notifications not initialized. Cordova is not available - Run in physical device");
                return;
            }

            let push = Push.init({
                android: {
                    senderID: "1001837472292"
                },
                ios: {
                    alert: "true",
                    badge: false,
                    sound: "true"
                },
                windows: {}
            });
            push.on('registration', (data) => {
                var deviceToken = data && data.registrationId ? data.registrationId : '';
                var deviceUuid = Device.uuid ? Device.uuid : '';
                var deviceModel = Device.model ? Device.model : '';
                var deviceManufacturer = Device.manufacturer ? Device.manufacturer : '';

                var devicePlatform = Device.platform ? Device.platform : '';
                var deviceVersion = Device.version ? Device.version : '';

                let deviceData = {
                    token: deviceToken,
                    uuid: deviceUuid,
                    model: deviceModel,
                    platform: devicePlatform,
                    version: deviceVersion,
                    manufacturer: deviceManufacturer
                };

                if (deviceToken) {
                    this.storage.get('deviceToken').then((currentDeviceToken: any) => {
                        if (!currentDeviceToken || currentDeviceToken && (currentDeviceToken != deviceToken)) {
                            this.usersSvc.addDevice(deviceData).then((response: any) => {
                                console.log(response);
                                this.storage.set('deviceToken', response.device_token);
                            });
                        }
                    });
                }
            });

            push.on('notification', (data) => {
                if (!data && !data.additionalData) {
                    return false;
                }

                if (data.additionalData.type == 'assign_job') {
                    this.nav.setRoot(Schedule);
                }

            });


        });
    }


    goToSettings() {
        this.nav.setRoot(Settings).catch(() => {
            console.log("Didn't set nav root");
        });
    }

    openPage(page: PageInterface) {
        if (page.logsOut === true) {
            return this.authSvc.logout({}).then((response: any) => {
                if (response && response.status == 'OK') {
                    this.storage.remove('token');
                    this.storage.remove('user');
                    this.storage.remove('deviceToken');
                    this.nav.setRoot(Login);
                    return;
                }
            }).catch((error: any) => {});
        }
        if (page.index) {
            this.nav.setRoot(page.component, {tabIndex: page.index});
        } else {
            this.nav.setRoot(page.component).catch(() => {
                console.log("Didn't set nav root");
            });
        }
    }
    platformReady() {
        // Call any initial plugins when ready
        this.platform.ready().then(() => {
            Splashscreen.hide();
        });
    }

    isActive(page: PageInterface) {
        let childNav = this.nav.getActiveChildNav();

        if (childNav) {
            if (childNav.getSelected() && childNav.getSelected().root === page.tabComponent) {
                return 'side-menu-active';
            }
            return;
        }

        if (this.nav.getActive() && this.nav.getActive().component === page.component) {
            return 'side-menu-active';
        }
        return;
    }

    changeAvatar() {
        var options = {
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY
        };
        Camera.getPicture(options).then((base64Image: any) => {
            this.usersSvc.changeAvatar({avatar: base64Image}).then((response: any) => {
                if (response && response.status == "OK") {
                    this.user.avatar_url = response.avatar_url;
                } else if (response && response.status == 'ERROR') {
                    this.defaultSvc.showToastWithCloseButton('Error change new avatar', 'Close', 'middle');
                    return;
                }
            });
        }).catch((error: any) => {

        });
    }

}
