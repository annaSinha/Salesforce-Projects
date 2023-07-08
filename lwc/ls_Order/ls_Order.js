import { LightningElement,api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class Ls_Order extends LightningElement {
    @api cartTotal;
    @track current = '1';
    @track contactInfo = {country:"", street:"", city:"", province:"", postalCode:""};
    @track error = false;
    @track modalHeading = 'Contact Information';
    _title = 'Required';
    message = 'Please fill out all required fields';
    variant = 'error';

    closeModal(event) {
        this.dispatchEvent(new CustomEvent('closemodal'));
    }

    get isFirstStep() {
        return this.current === '1' ? true : false;
    }

    addressChange(event) {
        console.log(JSON.stringify(event.detail));
        this.contactInfo.country = event.detail.country;
        this.contactInfo.street = event.detail.street;
        this.contactInfo.city = event.detail.city;
        this.contactInfo.province = event.detail.province;
        this.contactInfo.postalCode = event.detail.postalCode;
    }

    previousStep(event) {
        this.current = '1';
        this.template.querySelector('div.stepTwo').classList.add('slds-hide');
        this.template.querySelector('div.stepOne').classList.remove('slds-hide');
        this.modalHeading = 'Contact Information';
    }

    nextStep(event) {
        this.error = false;
        let inputs = this.template.querySelectorAll("lightning-input");
        inputs.forEach(function(element) {
            console.log(element.name, ": ", element.value);
            if(!element.name.startsWith('card')) {
                if(element.value != "" && element.value != undefined) {
                    this.contactInfo[element.name] = element.value;
                } else {
                    this.error = true;
                    this.showNotification();
                }
            }
        }, this);
        if(!this.error) {
            const address = this.template.querySelector('lightning-input-address');
            const isValid = address.checkValidity();
            if(!isValid) {
                this.error = true;
                this.showNotification();
            }
        }
        if(!this.error) {
            this.current = '2';
            this.template.querySelector('div.stepOne').classList.add('slds-hide');
            this.template.querySelector('div.stepTwo').classList.remove('slds-hide');
            this.modalHeading = 'Payment Information';
        }
    }

    submitOrder(event) {
        this.error = false;
        let inputs = this.template.querySelectorAll("lightning-input");
        inputs.forEach(function(element) {
            console.log(element.name, ": ", element.value);
            if(element.name.startsWith('card')) {
                if(element.value != "" && element.value != undefined) {
                    this.contactInfo[element.name] = element.value;
                } else {
                    this.error = true;
                    this.showNotification();
                }
            }
        }, this);
        if(!this.error) {
            console.log("contactInfo: ", JSON.stringify(this.contactInfo));
            this.dispatchEvent(new CustomEvent('submitorder', {detail: this.contactInfo}));
        }
    }

    showNotification() {
        const evt = new ShowToastEvent({
            title: this._title,
            message: this.message,
            variant: this.variant,
        });
        this.dispatchEvent(evt);
    }
}