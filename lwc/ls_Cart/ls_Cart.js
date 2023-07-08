import { LightningElement, track, wire } from 'lwc';
import lightningStepsChannel from '@salesforce/messageChannel/lightningStepsChannel__c';
import {subscribe, unsubscribe, APPLICATION_SCOPE, MessageContext} from 'lightning/messageService';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createOrder from '@salesforce/apex/ls_StoreUtility.createOrder';
import retrieveOrder from '@salesforce/apex/ls_StoreUtility.retrieveOrder';
import { NavigationMixin } from 'lightning/navigation';

export default class Ls_Cart extends NavigationMixin(LightningElement) {
    subscription = null;
    _title = 'One Product Limit';
    message = 'This Product with selected size is already in your cart.';
    variant = 'error';
    @track cartProducts = [];
    @track cartTotal = 0;
    @track showOrderModal = false;
    @wire(MessageContext)
    messageContext;

    subscribeToMessageChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                lightningStepsChannel,
                (message) => this.handleMessage(message),
                { scope: APPLICATION_SCOPE }
            );
        }
    }

    unsubscribeToMessageChannel() {
        unsubscribe(this.subscription);
        this.subscription = null;
    }

    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    handleMessage(message) {
        if(message.useCase === "addToCart") {
        //console.log("data received from channel ", JSON.stringify(message.recordData));
            if(this.cartProducts.length == 0) {
                this.cartProducts.push(message.recordData);
                this.cartTotal = message.recordData.price;
            } else if (this.cartProducts.findIndex(prod => prod.Id === message.recordData.Id && prod.selectedSize === message.recordData.selectedSize) != -1) {
                this.showNotification();
            } else {
                this.cartProducts.push(message.recordData);
                this.cartTotal += message.recordData.price;
            }
            console.log("cart Items : ", JSON.stringify(this.cartProducts));
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

    get cartHasProducts() {
        return this.cartProducts.length > 0 ? true : false;
    }

    handleCartDelete(event) {
        let productId = event.target.dataset.id;
        let productSize = event.target.dataset.size;
        const newCartProducts = this.cartProducts.filter(prod => {
            if(prod.Id === productId && prod.selectedSize === productSize) {
                this.cartTotal -= prod.price;
            } else {
                return prod;
            }
        });
        console.log("updated Cart: ", JSON.stringify(newCartProducts));
        this.cartProducts = Array.from(newCartProducts);
    }

    handleMakeOrder(event) {
        this.showOrderModal = true;
    }

    handlecloseModal(event) {
        this.showOrderModal = false;
    }

    handleSubmitOrder(event) {
        console.log("Before Submitting: ", JSON.stringify(event.detail));
        let contactInfo = event.detail;
        let payload = {contactInfo: contactInfo, cartProducts: this.cartProducts};
        createOrder(payload)
            .then(result => {
                console.log("Order Id: ", JSON.stringify(result));
                this.getOrder(contactInfo);
                this.showOrderModal = false;
                // this.navigateToOrder(orderId);
            })
            .catch(error => {
                console.log("Error: ", JSON.stringify(error));
            });
    }

    navigateToOrder(orderId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: orderId,
                objectApiName: 'Order',
                actionName: 'view'
            }
        });
    }

    getOrder(contactInfo) {
        retrieveOrder({contactInfo: contactInfo})
        .then(result => {
            this.navigateToOrder(result);
        })
        .catch(error => {
            console.log("Error: ", JSON.stringify(error));
        })
    }
}