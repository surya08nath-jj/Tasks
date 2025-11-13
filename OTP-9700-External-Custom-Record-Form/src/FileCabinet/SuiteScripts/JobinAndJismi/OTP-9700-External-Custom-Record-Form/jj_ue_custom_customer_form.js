/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/************************************************************************************************ 
 *  
 * OTP-9700 : Link Enquiry to Customer and Notify Stakeholders
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : User Event Script to link customer enquiries to matching customer records and notify admin and sales reps.
 * 
 * REVISION HISTORY
 *
 * @version 1.0 
 * 
*************************************************************************************************/

define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'], function (record, search, email, runtime, log) {

  const adminEmployeeId = -5; // 🔁 Replace with a valid employee internal ID

  /**
   * Searches for a customer record by email.
   * @param {string} customerEmail - Email address to search
   * @returns {search.Result|null} Matching customer result or null
   */
  function findCustomerByEmail(customerEmail) {
    try {
      const customerSearch = search.create({
        type: search.Type.CUSTOMER,
        filters: [['email', 'is', customerEmail]],
        columns: ['internalid', 'salesrep', 'entityid']
      });

      const searchResults = customerSearch.run().getRange({ start: 0, end: 1 });
      return searchResults.length > 0 ? searchResults[0] : null;
    }
    catch (error) {
      log.error({ title: 'findCustomerByEmail Error', details: error.message });
      return null;
    }
  }

  /**
   * Links a customer record to the enquiry record.
   * @param {number|string} enquiryRecordId - Internal ID of the enquiry record
   * @param {number|string} customerId - Internal ID of the customer
   */
  function linkCustomerToEnquiry(enquiryRecordId, customerId) {
    try {
      const enquiryRecord = record.load({
        type: 'customrecord_jj_custom_customer_record',
        id: enquiryRecordId,
        isDynamic: true
      });

      enquiryRecord.setValue({
        fieldId: 'custrecord_jj_customer_link',
        value: customerId
      });

      enquiryRecord.save();
      log.audit({ title: 'Customer Linked', details: `Linked enquiry ${enquiryRecordId} to customer ID ${customerId}` });
    }
    catch (error) {
      log.error({ title: 'linkCustomerToEnquiry Error', details: error.message });
    }
  }

  /**
   * Sends an email notification to the admin with enquiry details.
   * @param {string} customerName - Customer name
   * @param {string} customerEmail - Customer email
   * @param {string} enquirySubject - Enquiry subject
   * @param {string} enquiryMessage - Enquiry message
   */
  function notifyAdmin(customerName, customerEmail, enquirySubject, enquiryMessage) {
    try {
      email.send({
        author: adminEmployeeId,
        recipients: adminEmployeeId,
        subject: 'New Customer Enquiry',
        body: `Name: ${customerName}\nEmail: ${customerEmail}\nSubject: ${enquirySubject}\nMessage: ${enquiryMessage}`
      });
      log.audit({ title: 'Admin Notified', details: `Enquiry from ${customerName} sent to admin.` });
    }
    catch (error) {
      log.error({ title: 'notifyAdmin Error', details: error.message });
    }
  }

  /**
   * Sends an email notification to the customer's sales rep.
   * @param {number|string} salesRepId - Internal ID of the sales rep
   * @param {string} customerName - Customer name
   * @param {string} customerEmail - Customer email
   * @param {string} enquirySubject - Enquiry subject
   * @param {string} enquiryMessage - Enquiry message
   */
  function notifySalesRep(salesRepId, customerName, customerEmail, enquirySubject, enquiryMessage) {
    try {
      email.send({
        author: adminEmployeeId,
        recipients: salesRepId,
        subject: 'Customer Enquiry Received',
        body: `Customer: ${customerName} (${customerEmail})\nSubject: ${enquirySubject}\nMessage: ${enquiryMessage}`
      });
      log.audit({ title: 'Sales Rep Notified', details: `Enquiry from ${customerName} sent to sales rep ID ${salesRepId}.` });
    }
    catch (error) {
      log.error({ title: 'notifySalesRep Error', details: error.message });
    }
  }

  /**
   * Executes after a new enquiry record is created. Links customer and sends notifications.
   * @param {Object} context - User event context
   */
  function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE) return;

    try {
      const enquiryRecord = context.newRecord;
      const customerEmail = enquiryRecord.getValue('custrecord_jj_customer_email');
      const customerName = enquiryRecord.getValue('custrecord_jj_customer_name');
      const enquirySubject = enquiryRecord.getValue('custrecord_jj_subject');
      const enquiryMessage = enquiryRecord.getValue('custrecord_jj_message');

      if (!customerEmail) return;

      notifyAdmin(customerName, customerEmail, enquirySubject, enquiryMessage);

      const customerRecord = findCustomerByEmail(customerEmail);
      if (customerRecord) {
        const customerId = customerRecord.getValue('internalid');
        const salesRepId = customerRecord.getValue('salesrep');
        log.debug('Customer Found', `Customer ID: ${customerId}, Sales Rep ID: ${salesRepId}`);

        linkCustomerToEnquiry(enquiryRecord.id, customerId);

        if (salesRepId) {
          notifySalesRep(salesRepId, customerName, customerEmail, enquirySubject, enquiryMessage);
        }
      }
    }
    catch (error) {
      log.error({ title: 'afterSubmit Error', details: error.message });
    }
  }

  return {
    afterSubmit: afterSubmit
  };
});
