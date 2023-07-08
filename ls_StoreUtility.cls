public with sharing class ls_StoreUtility {
    @AuraEnabled(cacheable=true)
    public static List<Product2> retriveProducts(){
        try {
            
            List<Product2> productList = [SELECT Id, Name, Size__c, Product_Image__c, Description, Category__c, 
                                                (SELECT Id, UnitPrice FROM PriceBookEntries) 
                                            FROM Product2 WHERE Family = 'Shoes'];
            System.debug(productList);
            return productList;
        } catch (Exception e) {
            System.debug(e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Product2> retriveFilteredProducts(String[] category, String[] size) {
        try {
            String sizeString = '(\'' + String.join(size, '\',\'') + '\')';
            System.debug(category);
            System.debug(sizeString);
            String queryString = 'SELECT Id, Name, Size__c, Product_Image__c, Description, Category__c,' +
                                    '(SELECT Id, UnitPrice FROM PriceBookEntries)' +
                                    'FROM Product2 WHERE Family = \'Shoes\' AND Category__c IN: category AND Size__c INCLUDES ' + sizeString;
            List<Product2> productList = Database.query(queryString);
            
            System.debug(productList);
            return productList;
        } catch (Exception e) {
            System.debug(e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static void createOrder(Map<String,Object> contactInfo, List<Object> cartProducts) {
        System.debug(contactInfo);
        System.debug(cartProducts);
        String accountId = '';
        String contactId = '';
        List<Contact> contactList = [SELECT Id, AccountId FROM Contact 
                                        WHERE LastName =: (String)contactInfo.get('lname') 
                                        AND Email =: (String)contactInfo.get('email')];
        if(contactList.isEmpty()) {
            Account accRec = new Account();
            accRec.Name = (String)contactInfo.get('fname') + ' ' + (String)contactInfo.get('lname') + ' ' + 'Account';
            accRec.Type = 'Customer - Direct';
            accRec.Phone = (String)contactInfo.get('phone');
            insert accRec;

            Contact conRec = new Contact();
            conRec.FirstName = (String)contactInfo.get('fname');
            conRec.LastName = (String)contactInfo.get('lname');
            conRec.AccountId = accRec.Id;
            conRec.Phone = (String)contactInfo.get('phone');
            conRec.Email = (String)contactInfo.get('email');
            conRec.MailingStreet = (String)contactInfo.get('street');
            conRec.MailingPostalCode = (String)contactInfo.get('postalCode');
            conRec.MailingCity = (String)contactInfo.get('city');
            conRec.MailingState = (String)contactInfo.get('state');
            conRec.MailingCountry = (String)contactInfo.get('country');
            insert conRec;
            accountId = accRec.Id;
            contactId = conRec.Id;
        } else {
            accountId = contactList[0].AccountId;
            contactId = contactList[0].Id;
        }

        Id pbId = [SELECT Id, Name FROM Pricebook2 WHERE isStandard = true LIMIT 1].Id;
        Order orderRec = new Order();
        orderRec.AccountId = accountId;
        orderRec.BillToContactId = contactId;
        orderRec.ShipToContactId = contactId;
        orderRec.Pricebook2Id = pbId;
        orderRec.Status = 'Draft';
        orderRec.BillingStreet = (String)contactInfo.get('street');
        orderRec.BillingPostalCode = (String)contactInfo.get('postalCode');
        orderRec.BillingCity = (String)contactInfo.get('city');
        orderRec.BillingState = (String)contactInfo.get('state');
        orderRec.BillingCountry = (String)contactInfo.get('country');
        orderRec.EffectiveDate = Date.today();
        insert orderRec;

        List<OrderItem> orderItemList = new List<OrderItem>();
        for(Object obj: cartProducts) {
            Map<String,Object> productMap = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(obj));
            List<Object> pricebookEntries = (List<Object>) JSON.deserializeUntyped(JSON.serialize(productMap.get('PricebookEntries')));
            Map<String,Object> pricebookEntryMap = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(pricebookEntries[0]));

            OrderItem oiRec = new OrderItem();
            oiRec.OrderId = orderRec.Id;
            oiRec.PricebookEntryId = (String)pricebookEntryMap.get('Id');
            oiRec.Product2Id = (String)productMap.get('Id');
            oiRec.UnitPrice = (Double)productMap.get('price');
            oiRec.Quantity = 1;
            oiRec.Description = (String)productMap.get('Description');
            oiRec.Size__c = (String)productMap.get('size');
            orderItemList.add(oiRec);
        }

        if(!orderItemList.isEmpty()) {
            insert orderItemList;
        }
        //return orderRec.Id;
    }

    @AuraEnabled(cacheable=true)
    public static String retrieveOrder(Map<String, Object> contactInfo){
        try {
            List<Contact> contactList = [SELECT Id, AccountId FROM Contact 
                                        WHERE LastName =: (String)contactInfo.get('lname') 
                                        AND Email =: (String)contactInfo.get('email')];
            if(!contactList.isEmpty()) {
                String accountId = contactList[0].AccountId;
                return [SELECT Id FROM Order WHERE AccountId =: accountId ORDER BY CreatedDate DESC LIMIT 1].Id;
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return 'success';
    }
}