import { LightningElement, track, wire } from 'lwc';
import retriveProducts from '@salesforce/apex/ls_StoreUtility.retriveProducts';
import lightningsteps from '@salesforce/resourceUrl/lightningsteps';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';
import lightningStepsChannel from '@salesforce/messageChannel/lightningStepsChannel__c';
import {publish, MessageContext} from 'lightning/messageService';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {subscribe, unsubscribe, APPLICATION_SCOPE} from 'lightning/messageService';
import retriveFilteredProducts from '@salesforce/apex/ls_StoreUtility.retriveFilteredProducts';



export default class Ls_Store extends LightningElement {
    @track productList = [];
    _title = 'Required';
    message = 'Please select product size before adding it to the cart.';
    variant = 'error';
    
    connectedCallback() {
        Promise.all([
            loadStyle(this, lightningsteps)
        ])
    }

    @wire(MessageContext)
    messageContext;

   
    
    @wire(retriveProducts)
    products ({error, data}) {

        if (error) {
            // TODO: Error handling
        } else if (data) {
            // TODO: Data handling
            console.log(JSON.stringify(data));
            this.handleProductRetrieval(data);
            // let productData = JSON.parse(JSON.stringify(data));
            // productData.forEach((product, index) => {
            //     productData[index].options = product.Size__c.split(';').map(item => {
            //         return {label: item, value: item};
            //     });
            //     productData[index].price = product.PricebookEntries[0].UnitPrice;
            //     productData[index].selectedSize = "";
            // });
            // this.productList = productData;
        }
    }

    handleProductRetrieval(data) {
        let productData = JSON.parse(JSON.stringify(data));
            productData.forEach((product, index) => {
                productData[index].options = product.Size__c.split(';').map(item => {
                    return {label: item, value: item};
                });
                productData[index].price = product.PricebookEntries[0].UnitPrice;
                productData[index].selectedSize = "";
            });
            this.productList = productData;
    }

    handleAddToCart(event) {
        let productId = event.target.dataset.id;
        console.log("selected Id: ", productId);
        const selectedProduct = this.productList.find(prod => prod.Id === productId);
        selectedProduct.key = productId + selectedProduct.selectedSize;
        let payload = {useCase: "addToCart", recordId: productId, recordData: selectedProduct};
        if(selectedProduct.selectedSize == "") {
            this.showNotification();
        } else {
            console.log(JSON.stringify(selectedProduct));
            publish(this.messageContext, lightningStepsChannel, payload);
        }
	}

    updateSelectedSize(event) {
        let productId = event.target.name;
        console.log("selected Id: ", productId);
        var indexOfProduct = this.productList.findIndex(prod => prod.Id === productId);
        this.productList[indexOfProduct].selectedSize = event.target.value;
    }

    showNotification() {
        const evt = new ShowToastEvent({
            title: this._title,
            message: this.message,
            variant: this.variant,
        });
        this.dispatchEvent(evt);
    }
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
        if(message.useCase === "applyFilter") {
            console.log("data received from channel ", JSON.stringify(message.recordData));
            let filterPayload = JSON.parse(JSON.stringify(message.recordData));
            if(!filterPayload.hasOwnProperty('category') || filterPayload.category.length == 0) {
                filterPayload.category = filterPayload.categoryPicklistValues.data.values.map(item => item.value);
            }
            if(!filterPayload.hasOwnProperty('size')) {
                filterPayload.size = filterPayload.sizesPicklistValues.data.values.map(item => item.value);
            } else {
                filterPayload.size = [filterPayload.size];
            }
            delete filterPayload.categoryPicklistValues;
            delete filterPayload.sizesPicklistValues;
            console.log("filter Payload: ", JSON.stringify(filterPayload));
            retriveFilteredProducts(filterPayload)
                .then(result => {
                    console.log("filtered Products: ", JSON.stringify(result));
                    this.handleProductRetrieval(result);
                })
                .catch(error => {
                    console.log("filtered Products: ", JSON.stringify(error));
                });
        }
    }
}