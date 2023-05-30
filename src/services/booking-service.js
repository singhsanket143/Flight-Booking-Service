const axios = require('axios');
const {StatusCodes} = require('http-status-codes');

const { BookingRepository } = require('../repositories');
const { ServerConfig } = require('../config')
const db = require('../models');
const AppError = require('../utils/errors/app-error');

const bookingRepository = new BookingRepository();

async function createBooking(data) {
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
        const flightData = flight.data.data;
        if(data.noofSeats > flightData.totalSeats) {
            throw new AppError('Not enough seats available', StatusCodes.BAD_REQUEST);
        }
        const totalBillingAmount = data.noofSeats * flightData.price;
        const bookingPayload = {...data, totalCost: totalBillingAmount};
        const booking = await bookingRepository.create(bookingPayload, transaction);

        await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noofSeats
        });

        await transaction.commit();
        return booking;
    } catch(error) {
        await transaction.rollback();
        throw error;
    }
    
}

module.exports = {
    createBooking
}