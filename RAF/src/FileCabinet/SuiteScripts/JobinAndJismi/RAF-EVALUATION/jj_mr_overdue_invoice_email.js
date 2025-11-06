/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*************************************************************************************
***********
* Project Name : RAF-EVALUATION
*
*
*
*
**************************************************************************************
********
*
* Author: Suryanath G
*
* Date Created : 06-November-2025
*
* Description : This script is for sending overdue invoice emails to customers based on the due date field in the invoice record.
*
* REVISION HISTORY 1.1
*
* 
*
*
*************************************************************************************
**********/
define(['N/email', 'N/log', 'N/record', 'N/search','N/render','N/runtime'],
    /**
 * @param{email} email
 * @param{log} log
 * @param{record} record
 * @param{search} search
 * @param{render} render
 */
    (email, log, record, search,render) => {
        

        /**  Create Search for Overdue Invoices 
        * @returns {search} Search Object
        */
        function createSearch() {
            return search.create({
                type: search.Type.INVOICE,
                filters:
                    [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["status", "anyof", "CustInvc:A"],
                        "AND",
                        ["duedate", "onorbefore", "daysago15"],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [

                        search.createColumn({ name: "entity", label: "Name" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "daysoverdue", label: "Days Overdue" }),
                        search.createColumn({ name: "duedate", label: "Due Date" })
                    ]
            });
        }


        /**
         * 
         * logs the search results for debugging purposes
         */

        function logSearchResults(searchObj) {
            searchObj.run().each(result => {
                const customerName = result.getText('entity');
                const invoiceId = result.getValue('internalid');
                const daysOverdue = result.getValue('daysoverdue');

                log.debug({ title: 'Search Result', details: `Customer: ${customerName}, Invoice ID: ${invoiceId}, Days Overdue: ${daysOverdue}` });
                return true;
            });
        }
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */



        const getInputData = (inputContext) => {
            try {
                logSearchResults(createSearch());

                log.debug({ title: 'getInputData', details: 'Starting overdue invoice search' });
                const searchObj = createSearch();
                return searchObj;
            } catch (error) {
                log.error({ title: 'Error in getInputData', details: error });
                throw error;
            }


        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

        const map = (mapContext) => {
            try {
                const result = JSON.parse(mapContext.value);
                const invoiceData = result.values;
                const daysOverdue = invoiceData.daysoverdue;
                const customerId = invoiceData.entity.value;

                mapContext.write({
                    key: customerId,
                    value: daysOverdue
                });

            } catch (error) {
                log.error({ title: 'Error in map function', details: error });
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */

        /**
         * 
         * function to get customer email by loading customer record
         * @param {number} customerId - internal ID of the customer
         * @returns customer email address
         */
        const getCustomerEmail = (customerId) => {
            try {
                const customerRecord = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId
                });
                return customerRecord.getValue({ fieldId: 'email' });
            } catch (error) {
                log.error({ title: 'Error fetching customer email', details: error });
                return null;
            }
        };
        const reduce = (reduceContext) => {
            try {
                const customerId = reduceContext.key;
                const invoiceCount = reduceContext.values.length;


                log.audit({ title: 'Reduce Function', details: `Customer ID: ${customerId}, Overdue Invoices: ${invoiceCount}` });

                const customerEmail = getCustomerEmail(customerId);
                for (let i = 0; i < reduceContext.values.length; i++) {
                    var daysOverdue = parseInt(reduceContext.values[i]);


                    if (customerEmail) {
                        if (daysOverdue > 30) {
                            
                            const subject = 'Urgent: Overdue Invoice Notification';
                            const body = `Dear Customer,\n\nYou have ${invoiceCount} overdue invoices that are more than 30 days overdue. Please take immediate action to settle these invoices.\n\nBest Regards,\nJobin and Jismi`;
                            const senderId = -5; 
                            email.send({ subject: subject, body: body, author: senderId, recipients: customerId });
                            log.audit({ title: 'Email Sent', details: `Urgent email sent to Customer ID: ${customerId} at ${customerEmail}` });
                            return;
                        }

                        const subject = 'Friendly Reminder: Overdue Invoice Notification';
                        const body = `Dear Customer,\n\nYou have ${invoiceCount} overdue invoices. Please take the necessary actions.\n\nBest Regards,\nJobin and Jismi`;
                        const senderId = -5; 
                        email.send({ subject: subject, body: body, author: senderId, recipients: customerId });
                        log.audit({ title: 'Email Sent', details: `Email sent to Customer ID: ${customerId} at ${customerEmail}` });
                    } else {
                        log.error({ title: 'Missing Email', details: `No email found for Customer ID: ${customerId}` });
                    }
                };

            } catch (error) {
                log.error({ title: 'Error in reduce function', details: error });
            }


        }

        return { getInputData, map, reduce }

    });





