const recordTypeIds = {
	person: '7c12b42d-26eb-43c7-a3d1-25045869cbf6',
	conversation: '78d9db74-e0bd-4cd0-97f0-49b259509a47',
};

let fields;

/**
  * Get the ID of a record type
  * @param {string} typeName conversation or person
  * @returns {string} UUID of the type
  */
function getTypeId(typeName) {
	const typeId = recordTypeIds[typeName];
	if (!typeId) throw new Error(`Unknown typeName ${typeName}`);
	return typeId;
}

/**
  * Get the name of a record type
  * @param {string} typeId UUID of the type
  * @returns {string} Name of the type
  */
function getTypeName(typeId) {
	const typeName = Object.keys(recordTypeIds).find(key => recordTypeIds[key] === typeId);
	if (!typeName) throw new Error(`Unknown typeId ${typeId}`);

	return typeName;
}

/**
  * Get a field by label
  * typeId or typeName must be specified
  * @param {string} options.typeName conversation or person
  * @param {string} options.typeId The id of the conversation
  * @param {string} options.label (required) The label of the field
  * @returns {object} The field description object
  */
function getField({ label, typeId, typeName }) {
	if (!recordTypeIds[typeName]) {
		// eslint-disable-next-line no-param-reassign
		typeName = getTypeName(typeId);
	}

	if (!typeName) throw new Error(`Could not find type (typeId: ${typeId}, typeName: ${typeName})`);

	return fields[typeName].find(f => f.label === label);
}

/**
  * Get the ID of a field found by label
  * typeId or typeName must be specified
  * @param {string} options.typeName conversation or person
  * @param {string} options.typeId The id of the conversation
  * @param {string} options.label (required) The label of the field
  * @returns {string} The unique id of the field that kepla expects used in records
  */
function getFieldId(opts) {
	const field = getField(opts);
	if (!field) throw new Error(`Field not found (${JSON.stringify(opts)})`);

	return field.id;
}

/**
  * Takes a recrod to be created/updated where the keys are field labels
  * and maps those keys to their kepla field id
  * @param {string} typeId The id of the conversation
  * @param {object} data The record to be mapped
  * @returns {object} Record containing the same values as data, but with keys mapped to field ids
  */
function keysToKeplaFieldIds(typeId, data) {
	const result = {};
	Object.keys(data).forEach((label) => {
		let fieldId;
		if (label === 'id') {
			fieldId = label;
		} else {
			fieldId = getFieldId({ typeId, label });
		}
		result[fieldId] = data[label];
	});
	return result;
}

fields = {
	/* eslint-disable */
	person: [
		{
			"description": null,
			"id": "By2lLxCyZ",
			"label": "NRIC / FIN",
			"options": null,
			"order": 1,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "BJ6OBe0kb",
			"label": "Full Name",
			"options": null,
			"order": 2,
			"parent": false,
			"processAs": "name",
			"system": false,
			"type": "group"
		},
		{
			"description": null,
			"id": "Hy-auBlRJZ",
			"label": "Given Name",
			"options": null,
			"order": 3,
			"parent": "BJ6OBe0kb",
			"processAs": "firstName",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "B1MpdHgCkb",
			"label": "Family Name",
			"options": null,
			"order": 4,
			"parent": "BJ6OBe0kb",
			"processAs": "lastName",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "SJDyjeA1Z",
			"label": "Preferred Name",
			"options": null,
			"order": 5,
			"parent": "BJ6OBe0kb",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "SJdvtmio-",
			"label": "Contact Details",
			"options": null,
			"order": 6,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "group"
		},
		{
			"description": null,
			"id": "rkchXl0yZ",
			"label": "Mobile Phone",
			"options": null,
			"order": 7,
			"parent": "SJdvtmio-",
			"processAs": null,
			"system": false,
			"type": "phone"
		},
		{
			"description": null,
			"id": "BkFYHgRyW",
			"label": "Home/Work Phone",
			"options": null,
			"order": 8,
			"parent": "SJdvtmio-",
			"processAs": null,
			"system": false,
			"type": "phone"
		},
		{
			"description": null,
			"id": "Hy5iBgCkb",
			"label": "Email",
			"options": null,
			"order": 9,
			"parent": "SJdvtmio-",
			"processAs": null,
			"system": false,
			"type": "email"
		},
		{
			"description": null,
			"id": "rkgDC1OvM",
			"label": "Alternate email",
			"options": null,
			"order": 10,
			"parent": "SJdvtmio-",
			"processAs": null,
			"system": false,
			"type": "email"
		},
		{
			"description": "A link to a LinkedIn profile or similar",
			"id": "rk8LIYymX",
			"label": "URL",
			"options": null,
			"order": 11,
			"parent": "SJdvtmio-",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "om7LrMqa6",
			"label": "Work",
			"options": null,
			"order": 12,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "group"
		},
		{
			"description": null,
			"id": "3ZT21_k4N",
			"label": "Title",
			"options": null,
			"order": 13,
			"parent": "om7LrMqa6",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "wj9I8aJtI",
			"label": "Department",
			"options": null,
			"order": 14,
			"parent": "om7LrMqa6",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": "",
			"id": "rJcZ_mjsW",
			"label": "Gender",
			"options": [
				{
					"id": "Female",
					"label": "Female"
				},
				{
					"id": "Male",
					"label": "Male"
				},
				{
					"id": "Other",
					"label": "Other"
				}
			],
			"order": 15,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": null,
			"id": "SJYD4yw-W",
			"label": "Ethnicity",
			"options": null,
			"order": 16,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": "",
			"id": "r1ygFmisW",
			"label": "Date of Birth",
			"options": null,
			"order": 17,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "date"
		},
		{
			"description": null,
			"id": "BJ5bOPOZm",
			"label": "Residency",
			"options": [
				{
					"id": "singaporean",
					"label": "Singapore Citizen"
				},
				{
					"id": "permanent-resident",
					"label": "Permanent Resident"
				},
				{
					"id": "employment-pass",
					"label": "Employment Pass Holder"
				},
				{
					"id": "dependents-pass",
					"label": "Dependents Pass"
				},
				{
					"id": "other",
					"label": "Other"
				}
			],
			"order": 18,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": null,
			"id": "rkdRreA1W",
			"label": "Address",
			"options": null,
			"order": 19,
			"parent": false,
			"processAs": "address",
			"system": false,
			"type": "group"
		},
		{
			"description": null,
			"id": "B1bOASg0kW",
			"label": "Address Line 1",
			"options": null,
			"order": 20,
			"parent": "rkdRreA1W",
			"processAs": "address1",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "ryfu0rlRJ-",
			"label": "Address Line 2",
			"options": null,
			"order": 21,
			"parent": "rkdRreA1W",
			"processAs": "address2",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "Hy7_CHlA1Z",
			"label": "City",
			"options": null,
			"order": 22,
			"parent": "rkdRreA1W",
			"processAs": "city",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "BkEu0reAJb",
			"label": "Region",
			"options": null,
			"order": 23,
			"parent": "rkdRreA1W",
			"processAs": "region",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "BJBu0SgRyZ",
			"label": "Country",
			"options": null,
			"order": 24,
			"parent": "rkdRreA1W",
			"processAs": "country",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "ry8dRHeCkb",
			"label": "Post Code",
			"options": null,
			"order": 25,
			"parent": "rkdRreA1W",
			"processAs": "postalcode",
			"system": false,
			"type": "text"
		},
		{
			"description": "Internal description / notes",
			"id": "r1PeneAJZ",
			"label": "Notes",
			"options": null,
			"order": 26,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "textfield"
		},
		{
			"description": "Bio that may be shared externally",
			"id": "HkyTiQ4S-",
			"label": "Bio",
			"options": null,
			"order": 27,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "textfield"
		},
		{
			"description": null,
			"id": "rkjEj6cG-",
			"label": "Interest",
			"options": null,
			"order": 28,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "rk7wjacf-",
			"label": "Source",
			"options": null,
			"order": 29,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "By2E4yiM-",
			"label": "I would like to ...",
			"options": null,
			"order": 30,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "group"
		},
		{
			"description": "Host a Climate Conversation",
			"id": "B1cBEJsGZ",
			"label": "Host",
			"options": null,
			"order": 31,
			"parent": "By2E4yiM-",
			"processAs": null,
			"system": false,
			"type": "checkbox"
		},
		{
			"description": "Be trained to facilitate a Climate Conversation",
			"id": "SkjIEkjfZ",
			"label": "Facilitate",
			"options": null,
			"order": 32,
			"parent": "By2E4yiM-",
			"processAs": null,
			"system": false,
			"type": "checkbox"
		},
		{
			"description": "Volunteer with Climate Conversations",
			"id": "BkUvEyjMb",
			"label": "Volunteer",
			"options": null,
			"order": 33,
			"parent": "By2E4yiM-",
			"processAs": null,
			"system": false,
			"type": "checkbox"
		},
		{
			"description": "Receive updates from Climate Conversations",
			"id": "B1SvZcii-",
			"label": "Receive Updates",
			"options": null,
			"order": 34,
			"parent": "By2E4yiM-",
			"processAs": null,
			"system": false,
			"type": "checkbox"
		},
		{
			"description": "Spend 2 hours on climate action with friends",
			"id": "SJYYYtlvG",
			"label": "Take 2 hours with friends",
			"options": null,
			"order": 35,
			"parent": "By2E4yiM-",
			"processAs": null,
			"system": false,
			"type": "checkbox"
		},
		{
			"description": "Attend a Climate Conversation",
			"id": "SyqUY5TCG",
			"label": "Attend a Conversation",
			"options": null,
			"order": 36,
			"parent": "By2E4yiM-",
			"processAs": null,
			"system": false,
			"type": "checkbox"
		},
		{
			"description": null,
			"id": "HkBnYFeDz",
			"label": "Facilitator",
			"options": null,
			"order": 37,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "group"
		},
		{
			"description": null,
			"id": "BJoTYYxPz",
			"label": "Facilitator Level",
			"options": [
				{
					"id": "trainee",
					"label": "Trainee"
				},
				{
					"id": "emerging",
					"label": "Emerging"
				},
				{
					"id": "established",
					"label": "Established"
				},
				{
					"id": "mentor",
					"label": "Mentor"
				}
			],
			"order": 38,
			"parent": "HkBnYFeDz",
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": null,
			"id": "T_kyBCM2j",
			"label": "Facilitator Status",
			"options": [
				{
					"id": "active",
					"label": "Active"
				},
				{
					"id": "dormant",
					"label": "Dormant"
				},
				{
					"id": "retired",
					"label": "Retired"
				},
				{
					"id": "quit-training",
					"label": "Quit Training"
				}
			],
			"order": 39,
			"parent": "HkBnYFeDz",
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": "This facilitators mentor",
			"id": "SFDdn8Lnk",
			"label": "Mentor",
			"options": null,
			"order": 40,
			"parent": "HkBnYFeDz",
			"processAs": null,
			"related": "7c12b42d-26eb-43c7-a3d1-25045869cbf6",
			"system": false,
			"taxonomyId": "f9d10339-1bc0-4088-a892-16d06b4d8ac1",
			"type": "relationship"
		},
		{
			"description": null,
			"id": "Lly2GvI87",
			"label": "Facilitator Team Leader (FTL)",
			"options": null,
			"order": 41,
			"parent": "HkBnYFeDz",
			"processAs": null,
			"related": "7c12b42d-26eb-43c7-a3d1-25045869cbf6",
			"system": false,
			"taxonomyId": "45d858af-771b-4ce3-a47d-48b2c4e08ebb",
			"type": "relationship"
		},
		{
			"description": null,
			"id": "SJB_5QsoZ",
			"label": "Volunteering",
			"options": null,
			"order": 42,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "group"
		},
		{
			"description": "eg Photograph,  Videography, Design that the volunteer has expressed an interest in volunteering",
			"id": "BkmiHUBlX",
			"label": "Skills",
			"options": null,
			"order": 43,
			"parent": "SJB_5QsoZ",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "By9-2gA1-",
			"label": "Why volunteer?",
			"options": null,
			"order": 44,
			"parent": "SJB_5QsoZ",
			"processAs": null,
			"system": false,
			"type": "textfield"
		},
		{
			"description": null,
			"id": "S1zVma5f-",
			"label": "Circle of Commitment",
			"options": [
				{
					"id": "Contributor",
					"label": "Contributor"
				},
				{
					"id": "Committed",
					"label": "Committed"
				},
				{
					"id": "Core",
					"label": "Core"
				}
			],
			"order": 45,
			"parent": "SJB_5QsoZ",
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": null,
			"id": "H1hBN6cGb",
			"label": "Highest Circle of Commitment",
			"options": [
				{
					"id": "Contributor",
					"label": "Contributor"
				},
				{
					"id": "Committed",
					"label": "Committed"
				},
				{
					"id": "Core",
					"label": "Core"
				}
			],
			"order": 46,
			"parent": "SJB_5QsoZ",
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": "Languages & Dialects (other than English) that the person is fluent in",
			"id": "H10gB8SeQ",
			"label": "Languages & Dialects",
			"options": null,
			"order": 47,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "group"
		},
		{
			"description": "Separate different entries with a comma",
			"id": "B1WfHUSeQ",
			"label": "Spoken Languages",
			"options": null,
			"order": 48,
			"parent": "H10gB8SeQ",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": "Separate different entries with a comma",
			"id": "HyvfB8rgX",
			"label": "Written Languages",
			"options": null,
			"order": 49,
			"parent": "H10gB8SeQ",
			"processAs": null,
			"system": false,
			"type": "text"
		},
		{
			"description": "Climate Conversations",
			"id": "mailchimp",
			"label": "Mailchimp",
			"options": null,
			"order": 50,
			"parent": false,
			"processAs": null,
			"system": true,
			"type": "group"
		},
	],
	conversation: [
		{
			"description": null,
			"id": "B1CZNl0Jb",
			"label": "Date of Gathering",
			"options": null,
			"order": 1,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "date"
		},
		{
			"description": null,
			"id": "SyT7kqoi-",
			"label": "Status",
			"options": [
				{
					"id": "Planned",
					"label": "Planned"
				},
				{
					"id": "Completed",
					"label": "Completed"
				},
				{
					"id": "Cancelled",
					"label": "Cancelled"
				}
			],
			"order": 2,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": null,
			"id": "SyzUNxRJb",
			"label": "Host",
			"options": null,
			"order": 3,
			"parent": false,
			"processAs": null,
			"related": "7c12b42d-26eb-43c7-a3d1-25045869cbf6",
			"system": false,
			"taxonomyId": "5a669a95-4a65-4321-83ba-1f6a7d282360",
			"type": "relationship"
		},
		{
			"description": null,
			"id": "B1G5Vx0kW",
			"label": "Facilitator",
			"options": null,
			"order": 4,
			"parent": false,
			"processAs": null,
			"related": "7c12b42d-26eb-43c7-a3d1-25045869cbf6",
			"system": false,
			"taxonomyId": "73bf0ff3-cb85-46d2-ac97-b5e0256c568d",
			"type": "relationship"
		},
		{
			"description": null,
			"id": "rJqdwdalX",
			"label": "Type of Conversation",
			"options": [
				{
					"id": "personal",
					"label": "Personal"
				},
				{
					"id": "public",
					"label": "Public"
				},
				{
					"id": "corporate",
					"label": "Corporate"
				}
			],
			"order": 5,
			"parent": false,
			"processAs": null,
			"system": false,
			"type": "select"
		},
		{
			"description": null,
			"id": "HJUrUl0kb",
			"label": "Address",
			"options": null,
			"order": 6,
			"parent": false,
			"processAs": "address",
			"system": false,
			"type": "group"
		},
		{
			"description": null,
			"id": "SJWUSUl0k-",
			"label": "Address Line 1",
			"options": null,
			"order": 7,
			"parent": "HJUrUl0kb",
			"processAs": "address1",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "Hyz8SUlAkZ",
			"label": "Address Line 2",
			"options": null,
			"order": 8,
			"parent": "HJUrUl0kb",
			"processAs": "address2",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "HyX8rIg0yZ",
			"label": "City",
			"options": null,
			"order": 9,
			"parent": "HJUrUl0kb",
			"processAs": "city",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "ByE8BLg0J-",
			"label": "Region",
			"options": null,
			"order": 10,
			"parent": "HJUrUl0kb",
			"processAs": "region",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "B1rIHIgRyW",
			"label": "Country",
			"options": null,
			"order": 11,
			"parent": "HJUrUl0kb",
			"processAs": "country",
			"system": false,
			"type": "text"
		},
		{
			"description": null,
			"id": "rkLIBUg01Z",
			"label": "Postal Code",
			"options": null,
			"order": 12,
			"parent": "HJUrUl0kb",
			"processAs": "postalcode",
			"system": false,
			"type": "text"
		}
	],
};

module.exports = {
	fields,
	getField,
	getFieldId,
	getTypeId,
	getTypeName,
	keysToKeplaFieldIds
}
