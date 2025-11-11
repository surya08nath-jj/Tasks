/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

/************************************************************************************************ 
 *  
 * OTP-9638 : Automate Overdue Invoice Notifications
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 10-November-2025 
 * 
 * Description : Map/Reduce script to identify overdue invoices from the previous month, generate CSV summaries per customer, and email them to respective contacts.
 * 
 * REVISION HISTORY
 *
 * @version 1.0 
 * 
*************************************************************************************************/

define(['N/search', 'N/log', 'N/file', 'N/email', 'N/record'],
  /**
   * @param {search} search
   * @param {log} log
   * @param {file} file
   * @param {email} email
   * @param {record} record
   */
  (search, log, file, email, record) => {

    /**
     * Creates a saved search to retrieve overdue invoices from last month.
     * @returns {search.Search} Invoice search object
     */
    const createInvoiceSearch = () => {
      try {
        return search.create({
          type: search.Type.INVOICE,
          filters: [
            ['duedate', 'onorbefore', 'lastmonth'],
            'AND',
            ['status', 'anyof', ['CustInvc:A']],
            'AND',
            ['mainline', 'is', 'T'],
            'AND',
            ['customermain.isinactive', 'is', 'F'],
            'AND',
            ['salesrep.isinactive', 'is', 'F']
          ],
          columns: [
            'internalid',
            'tranid',
            'entity',
            'amount',
            'duedate',
            'salesrep',
            'daysoverdue'
          ]
        });
      } catch (error) {
        log.error('createInvoiceSearch Error', error.message);
        throw error;
      }
    };

    /**
     * Logs each result from the invoice search for debugging purposes.
     * @param {search.Search} searchObj - The invoice search object
     */
    const logSearchResults = (searchObj) => {
      try {
        searchObj.run().each(searchResult => {
          log.debug('Search Result', `Customer: ${searchResult.getText('entity')}, Invoice: ${searchResult.getValue('tranid')}, Amount: ${searchResult.getValue('amount')}, Due: ${searchResult.getValue('duedate')}, Days Overdue: ${searchResult.getValue('daysoverdue')}`);
          return true;
        });
      } catch (error) {
        log.error('logSearchResults Error', error.message);
      }
    };

    /**
     * Retrieves the email address of a customer.
     * @param {number|string} customerId - Internal ID of the customer
     * @returns {string|null} Email address or null if not found
     */
    const getCustomerEmail = (customerId) => {
      try {
        return record.load({
          type: record.Type.CUSTOMER,
          id: customerId
        }).getValue('email');
      } catch (error) {
        log.error('getCustomerEmail Error', error.message);
        return null;
      }
    };

    /**
     * Creates a CSV file summarizing overdue invoices for a customer.
     * @param {string} customerName - Name of the customer
     * @param {Object[]} invoiceList - Array of invoice data
     * @param {string} customerEmail - Email address of the customer
     * @returns {file.File} NetSuite file object
     */
    const createCsvFile = (customerName, invoiceList, customerEmail) => {
      try {
        const csvContent = ['Customer Name, Customer Email,Invoice Number,Invoice Amount,Due Date,Days Overdue'];
        invoiceList.forEach(invoice => {
          csvContent.push(`${invoice.customerName},${customerEmail},${invoice.invoiceNumber},${invoice.invoiceAmount},${invoice.dueDate},${invoice.daysOverdue}`);
        });

        const csvFile = file.create({
          name: `Overdue_Invoices_${customerName}.csv`,
          fileType: file.Type.CSV,
          contents: csvContent.join('\n'),
          folder: 116 // Replace with your File Cabinet folder ID
        });

        csvFile.save();
        return csvFile;
      } catch (error) {
        log.error('createCsvFile Error', error.message);
        throw error;
      }
    };

    /**
     * Sends an email with the CSV file attached to the customer.
     * @param {number} senderId - Internal ID of the sender (sales rep or fallback)
     * @param {number|string} customerId - Internal ID of the customer
     * @param {string} customerName - Name of the customer
     * @param {file.File} csvFile - CSV file object
     * @param {string} customerEmail - Email address of the customer
     */
    const sendEmailWithAttachment = (senderId, customerId, customerName, csvFile, customerEmail) => {
      try {
        email.send({
          author: senderId,
          recipients: customerId,
          subject: 'Monthly Overdue Invoice Notification',
          body: `Dear ${customerName},\n\nPlease find attached your overdue invoices as of last month.\n\nRegards,\nFinance Team`,
          attachments: [csvFile]
        });

        log.audit('Email Sent', `Email sent to ${customerName} (${customerEmail}) from sender ID ${senderId}.`);
      } catch (error) {
        log.error('sendEmailWithAttachment Error', `Customer: ${customerName}, Error: ${error.message}`);
      }
    };

    /**
     * Retrieves input data for the Map/Reduce process.
     * @returns {search.Search} Invoice search object
     */
    const getInputData = () => {
      try {
        log.debug('getInputData', 'Starting overdue invoice search');
        const invoiceSearchObj = createInvoiceSearch();
        logSearchResults(invoiceSearchObj);
        return invoiceSearchObj;
      } catch (error) {
        log.error('getInputData Error', error.message);
        throw error;
      }
    };

    /**
     * Processes each invoice record and prepares summary data for reduction.
     * @param {Object} scriptContext - Map context object
     */
    const map = (scriptContext) => {
      try {
        const searchResult = JSON.parse(scriptContext.value);
        const invoiceData = searchResult.values;

        const customerId = invoiceData.entity.value;
        const invoiceSummary = {
          invoiceId: searchResult.id,
          invoiceNumber: invoiceData.tranid,
          invoiceAmount: invoiceData.amount,
          dueDate: invoiceData.duedate,
          daysOverdue: invoiceData.daysoverdue,
          customerName: invoiceData.entity.text,
          salesRep: invoiceData.salesrep ? invoiceData.salesrep.value : null
        };

        scriptContext.write({
          key: customerId,
          value: invoiceSummary
        });
      } catch (error) {
        log.error('map Error', error.message);
      }
    };

    /**
     * Aggregates invoice data per customer and sends notification emails.
     * @param {Object} scriptContext - Reduce context object
     */
    const reduce = (scriptContext) => {
      try {
        const customerId = scriptContext.key;
        const invoiceList = scriptContext.values.map(JSON.parse);
        const customerName = invoiceList[0].customerName;
        const salesRepId = invoiceList[0].salesRep;
        const fallbackSenderId = -5; // Replace with your Admin ID

        const customerEmail = getCustomerEmail(customerId);
        if (!customerEmail) {
          log.error('Missing Email', `Customer ${customerName} (${customerId}) has no email`);
          return;
        }

        const csvFile = createCsvFile(customerName, invoiceList, customerEmail);
        const senderId = salesRepId || fallbackSenderId;

        sendEmailWithAttachment(senderId, customerId, customerName, csvFile, customerEmail);
      } catch (error) {
        log.error('reduce Error', error.message);
      }
    };

    return { getInputData, map, reduce };
  });
