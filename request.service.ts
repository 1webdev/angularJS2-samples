import {Injectable} from "@angular/core";
import {LoadingController, App} from 'ionic-angular';
import {Http, Headers, RequestOptions, Response} from '@angular/http';
import {Observable} from 'rxjs/Rx';
import 'rxjs/add/operator/toPromise';
import {Storage} from '@ionic/storage';
import {DefaultService} from "./default.service";
import {Login} from '../pages/login/login';

@Injectable()
export class RequestService {

    loader: any;
    apiEndpoint: string;

    constructor(
        public loadingCtrl: LoadingController,
        public http: Http,
        public storage: Storage,
        public app: App,
        public defaultSvc: DefaultService
    ) {
        this.loadingCtrl = loadingCtrl;
        this.http = http;
        this.apiEndpoint = 'http://test/api/';
        //this.apiEndpoint = 'http://test_local/api/';

    }

    showLoading() {
        let loading = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loader = loading;
        this.loader.present();
        return this.loader;
    }

    hideLoading() {
        this.loader.dismiss();
    }

    httpRequestPost(data: Object, url: string): Promise<Response> {
        this.defaultSvc.showLoading();
        let headers = new Headers({'Content-Type': 'application/json'});
        return this.storage.get('token').then((hasToken) => {
            if (hasToken) {
                headers.append('x-access-token', hasToken);
            }
            let options = new RequestOptions({headers: headers});
            let results = this.http.post(this.apiEndpoint + url, data, options)
                .toPromise()
                .then(this.extractData)
                .catch(this.handleError);
            return results.then((response: any) => {
                this.defaultSvc.hideLoading();
                if (response && response.status == 'ERROR_AUTH_TOKEN') {
                    this.storage.remove('token').then(() => {
                        this.app.getRootNav().setRoot(Login);
                    });
                }
                return results;
            }).catch((error: any) => {
                this.defaultSvc.hideLoading();
                return error;
            });
        });
    }


    private extractData(res: Response) {
        let body = res.json();
        return body || {};
    }

    private handleError(error: Response | any) {
        // In a real world app, we might use a remote logging infrastructure
        let errMsg: string;
        if (error instanceof Response) {
            const body = error.json() || '';
            const err = body.error || JSON.stringify(body);
            errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
        } else {
            errMsg = error.message ? error.message : error.toString();
        }
        console.error(errMsg);
        return Observable.throw(errMsg);
    }


}