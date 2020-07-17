const fs = require("fs");
const path = require("path");
const requireFromString = require("require-from-string");
const { expect } = require("chai");
const get = require("lodash/get");
const dayjs = require('dayjs');
const _ = require('lodash');

const DummyRaiselyComponents = {
	Common: { dayjs, ..._.pick(_, ['get', 'set']) },
};

function loadClass(filename) {
	const fullPath = path.join(__dirname, filename);
	const file = fs.readFileSync(fullPath, "utf8");
	const prepend = "module.exports = ";
	const mod = requireFromString(prepend + file, path);
	const DummyReact = class DummyReact {};
	return mod(DummyRaiselyComponents, DummyReact);
}

describe("Date functions", () => {
	let Event
	before(() => {
		Event = loadClass("./event.js");
	});
	describe("singaporeToISO", () => {
		it("formats correctly during DST", async () => {
			const isoDate = await Event.singaporeToISO('2020-02-05', '20:30');
			expect(isoDate).to.eq('2020-02-05T12:30:00.000Z');
		});
		it("formats correctly outside DST", async () => {
			const isoDate = await Event.singaporeToISO(
				"2020-06-05",
				"20:30"
			);
			expect(isoDate).to.eq("2020-06-05T12:30:00.000Z");
		});
	});
	describe("displayDate", () => {
		it("formats correctly", async () => {
			const event = { startAt: "2020-02-04T12:30:00.000Z" };
			const displayDate = await Event.displayDate(event, 'D MMM YYYY, HH:mm');
			expect(displayDate).to.eq('4 Feb 2020, 20:30')
		});
	});
	describe("getTime", () => {
		it("formats correctly", async () => {
			const event = { startAt: "2020-02-04T12:30:00.000Z" };
			Event.getTime(event);
			expect(_.pick(event, ['startAt', 'startTime'])).to.deep.eq({
				startAt: "2020-02-04",
				startTime: '20:30'
			});
		});
	});
	describe("getTime", () => {
		it("formats correctly", async () => {
			const event = {
				startAt: "2020-02-04",
				startTime: "20:30"
			};
			Event.setTime(event);
			expect(event.startAt).to.eq("2020-02-04T12:30:00.000Z");
		});
	});
	describe("singaporeTimeAndDate", () => {
		it("formats correctly", async () => {
			const timeAndDate = Event.singaporeTimeAndDate("2020-02-04T12:30:00.000Z");
			expect(timeAndDate).to.deep.eq({
				date: '2020-02-04',
				time: '20:30',
			});
		});
	});
	describe("inSingaporeTime", () => {
		it("formats correctly", async () => {
			const timeAndDate = Event.inSingaporeTime(
				"2020-02-04T12:30:00.000Z"
			).format('YYYY-MM-DD HH:mm');
			expect(timeAndDate).to.eq('2020-02-04 20:30');
		});
	});
});
