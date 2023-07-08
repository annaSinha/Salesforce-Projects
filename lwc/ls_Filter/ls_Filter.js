import { LightningElement, wire } from 'lwc';
import lightningStepsChannel from '@salesforce/messageChannel/lightningStepsChannel__c';
import {publish, MessageContext} from 'lightning/messageService';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import PRODUCT_OBJECT from '@salesforce/schema/Product2';
import lightningsteps from '@salesforce/resourceUrl/lightningsteps';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';


// fields
import CATEGORY from "@salesforce/schema/Product2.Category__c";
import SIZES_FIELD from "@salesforce/schema/Product2.Size__c";


export default class Ls_Filter extends LightningElement {

    category = [];
	size;

    // to get the default record type id, if you dont' have any recordtypes then it will get master
    recordTypeId=''
    @wire(getObjectInfo, { objectApiName: PRODUCT_OBJECT })
        getobjectInfo(result) {
            if (result.data) {
            const rtis = result.data.recordTypeInfos;
                this.recordTypeId = Object.keys(rtis).find((rti) => rtis[rti].name === 'Master');
        }
    }
    @wire(MessageContext)
    messageContext;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: CATEGORY })
    categoryPicklistValues;

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: SIZES_FIELD })
    sizesPicklistValues;
	

    handleChange(event) {
        this[event.target.name] = event.detail.value;
        let payload = {useCase: "applyFilter", recordData:{
            category: this.category,
            size: this.size,
            categoryPicklistValues: this.categoryPicklistValues,
            sizesPicklistValues: this.sizesPicklistValues
        }
        };
        console.log("payload", payload);
        publish(this.messageContext, lightningStepsChannel, payload);
	}

    connectedCallback() {
        Promise.all([
            loadStyle(this, lightningsteps)
        ])
    }
}