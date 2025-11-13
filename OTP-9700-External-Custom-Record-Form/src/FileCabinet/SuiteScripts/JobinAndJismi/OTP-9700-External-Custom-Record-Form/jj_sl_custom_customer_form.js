/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

/************************************************************************************************ 
 *  
 * OTP-9700 : Customer Enquiry Capture
 * 
************************************************************************************************* 
 * 
 * Author: Jobin and Jismi IT Services 
 * 
 * Date Created : 11-November-2025 
 * 
 * Description : Suitelet to display a customer enquiry form and save submitted data to a custom record.
 * 
 * REVISION HISTORY
 *
 * @version 1.0
 * 
*************************************************************************************************/

define(['N/ui/serverWidget', 'N/record', 'N/log', 'N/search'], function (serverWidget, record, log, search) {

  /**
   * Builds and returns the customer enquiry form.
   * @param {string} [errorMessage] - Optional error message to display
   * @returns {serverWidget.Form} NetSuite form object
   */
  function buildCustomerEnquiryForm(errorMessage) {
    try {
      const enquiryForm = serverWidget.createForm({ title: 'Customer Enquiry Form' });

      if (errorMessage) {
        enquiryForm.addField({
          id: 'custpage_error',
          type: serverWidget.FieldType.INLINEHTML,
          label: ' '
        }).defaultValue = `<div style="color:red;font-weight:bold;">${errorMessage}</div>`;
      }

      enquiryForm.addField({
        id: 'custpage_customer_name',
        type: serverWidget.FieldType.TEXT,
        label: 'Customer Name'
      }).isMandatory = true;

      enquiryForm.addField({
        id: 'custpage_customer_email',
        type: serverWidget.FieldType.EMAIL,
        label: 'Customer Email'
      }).isMandatory = true;

      enquiryForm.addField({
        id: 'custpage_enquiry_subject',
        type: serverWidget.FieldType.TEXT,
        label: 'Subject'
      }).isMandatory = true;

      enquiryForm.addField({
        id: 'custpage_enquiry_message',
        type: serverWidget.FieldType.TEXTAREA,
        label: 'Message'
      }).isMandatory = true;

      enquiryForm.addSubmitButton({ label: 'Submit Enquiry' });

      return enquiryForm;
    }
    catch (error) {
      log.error({ title: 'buildCustomerEnquiryForm Error', details: error.message });
      throw error;
    }
  }

  /**
   * Checks if an enquiry with the same email already exists.
   * @param {string} customerEmail - Email address to check
   * @returns {boolean} True if duplicate exists, false otherwise
   */
  function checkDuplicateEnquiryByEmail(customerEmail) {
    try {
      const enquirySearch = search.create({
        type: 'customrecord_jj_custom_customer_record',
        filters: [['custrecord_jj_customer_email', 'is', customerEmail]],
        columns: ['internalid']
      });

      const searchResults = enquirySearch.run().getRange({ start: 0, end: 1 });
      return searchResults.length > 0;
    }
    catch (error) {
      log.error({ title: 'checkDuplicateEnquiryByEmail Error', details: error.message });
      return false;
    }
  }

  /**
   * Creates a custom enquiry record using submitted form data.
   * @param {Object} enquiryData - Form parameters containing name, email, subject, and message
   * @returns {number|null} Internal ID of the created record or null on failure
   */
  function createCustomerEnquiryRecord(enquiryData) {
    try {
      const enquiryRecord = record.create({
        type: 'customrecord_jj_custom_customer_record',
        isDynamic: true
      });

      enquiryRecord.setValue({ fieldId: 'custrecord_jj_customer_name', value: enquiryData.name });
      enquiryRecord.setValue({ fieldId: 'custrecord_jj_customer_email', value: enquiryData.email });
      enquiryRecord.setValue({ fieldId: 'custrecord_jj_subject', value: enquiryData.subject });
      enquiryRecord.setValue({ fieldId: 'custrecord_jj_message', value: enquiryData.message });

      const enquiryRecordId = enquiryRecord.save();
      log.audit({ title: 'Customer Enquiry Created', details: `Record ID: ${enquiryRecordId}` });

      return enquiryRecordId;
    }
    catch (error) {
      log.error({ title: 'createCustomerEnquiryRecord Error', details: error.message });
      return null;
    }
  }

  /**
   * Handles Suitelet request and response logic.
   * @param {Object} context - Suitelet context object
   */
  function onRequest(context) {
    try {
      if (context.request.method === 'GET') {
        context.response.writePage(buildCustomerEnquiryForm());
      } else {
        const enquiryData = {
          name: context.request.parameters.custpage_customer_name,
          email: context.request.parameters.custpage_customer_email,
          subject: context.request.parameters.custpage_enquiry_subject,
          message: context.request.parameters.custpage_enquiry_message
        };

        if (checkDuplicateEnquiryByEmail(enquiryData.email)) {
          const formWithError = buildCustomerEnquiryForm('An enquiry with this email already exists.');
          context.response.writePage(formWithError);
          return;
        }

        const enquiryRecordId = createCustomerEnquiryRecord(enquiryData);

        if (enquiryRecordId) {
          context.response.write(`Thank you! Your enquiry has been submitted. Reference ID: ${enquiryRecordId}`);
        } else {
          context.response.write('An error occurred while saving your enquiry. Please try again.');
        }
      }
    }
    catch (error) {
      log.error({ title: 'onRequest Error', details: error.message });
      context.response.write('An unexpected error occurred. Please try again later.');
    }
  }

  return {
    onRequest: onRequest
  };
});
