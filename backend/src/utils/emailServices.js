import axios from 'axios';
import qrcode from 'qrcode';
import puppeteer from 'puppeteer';
import Show from '../models/Show.js';

// --- UNIVERSAL API HELPER ---
const sendEmailViaAPI = async (toEmail, toName, subject, htmlContent, attachment = null) => {
    const payload = {
        sender: { name: "CineFlix", email: "cineflixmoviebooking@gmail.com" }, 
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent,
    };

    if (attachment) {
        payload.attachment = [{
            name: attachment.filename,
            content: Buffer.from(attachment.content).toString('base64')
        }];
    }

    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            }
        });
        console.log(`✅ Email sent successfully to ${toEmail}`);
        return true;
    } catch (error) {
        console.error("🚨 Brevo API Error:", error.response?.data || error.message);
        throw new Error("Failed to send email via API");
    }
};

// --- BOOKING EMAIL CONTROLLER ---
export const sendBookingEmail = async (userName, userEmail, booking) => {
    try {
        // 1. Fetch missing display data (Poster & Address)
        const show = await Show.findById(booking.show)
            .populate('movie', 'posterUrl')
            .populate('theater', 'location');

        const posterUrl = show?.movie?.posterUrl || 'https://via.placeholder.com/250x350?text=No+Poster';
        const theaterAddress = show?.theater?.location?.address || 'Address not available';

        // 2. Format Date/Time and Seats
        const showTime = new Date(booking.showSnapshot.startTime);
        const formattedDate = showTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const formattedTime = showTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const seatString = booking.seats.map(s => s.seatNumber).join(', ');

        // 3. Generate QR Code Hash
        const qrHash = Buffer.from(booking.paymentId || booking._id.toString()).toString('base64');
        const qrCodeDataUrl = await qrcode.toDataURL(qrHash, { margin: 1 });

        // 4. Build HTML Template for the PDF
        const pdfHtmlTemplate = `
            <div style="font-family: Arial, sans-serif; display: flex; border: 1px solid #eaeaea; border-radius: 12px; max-width: 800px; margin: 20px auto; overflow: hidden;">
                <div style="width: 250px; flex-shrink: 0;">
                    <img src="${posterUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div style="padding: 24px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h1 style="margin: 0; font-size: 24px; color: #1f2937;">${booking.showSnapshot.movieTitle}</h1>
                            <p style="margin: 8px 0 0 0; color: #4b5563; font-weight: 500;">${booking.showSnapshot.theaterName}</p>
                            <p style="margin: 4px 0 20px 0; font-size: 14px; color: #6b7280;">${theaterAddress}</p>
                        </div>
                        <span style="background: #f3f4f6; padding: 6px 12px; border-radius: 20px; font-family: monospace; font-size: 14px; color: #6b7280;">
                            ID: ${booking._id.toString().slice(-6).toUpperCase()}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <div style="flex-grow: 1;">
                            <div style="display: flex; gap: 40px; margin-bottom: 20px;">
                                <div>
                                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: bold;">Date & Time</p>
                                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #1f2937;">${formattedDate} at ${formattedTime}</p>
                                </div>
                                <div>
                                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: bold;">Screen</p>
                                    <p style="margin: 4px 0 0 0; font-weight: bold; color: #1f2937;">Screen ${booking.showSnapshot.screenNumber}</p>
                                </div>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">Seats</p>
                                <div style="display: flex; gap: 8px;">
                                    <span style="background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 4px; border: 1px solid #bfdbfe; font-weight: bold;">
                                        ${seatString}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div style="border: 2px dashed #e5e7eb; border-radius: 12px; padding: 12px; text-align: center; background: #f9fafb;">
                            <img src="${qrCodeDataUrl}" style="width: 100px; height: 100px;" />
                            <p style="margin: 8px 0 0 0; font-size: 10px; font-weight: bold; color: #9ca3af; letter-spacing: 2px;">M-TICKET</p>
                        </div>
                    </div>
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">Total Amount</p>
                        <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #1f2937;">₹${booking.totalAmount}</p>
                    </div>
                </div>
            </div>
        `;

        // 5. Convert HTML to PDF using Puppeteer
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(pdfHtmlTemplate, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 6. Define the Email Body and Attachment
        const emailBodyHtml = `
            <p>Hi ${userName},<p>
            <p>Your ticket for <strong>${booking.showSnapshot.movieTitle}</strong> has been successfully booked!</p>
            <p>Please find your M-Ticket attached as a PDF. You can show the QR code at the cinema entrance.</p>
            <br/>
            <p>Enjoy the show!</p>
            <p>The CineFlix Team</p>
        `;

        const attachment = {
            filename: `${booking.showSnapshot.movieTitle.replace(/\s+/g, '_')}_Ticket.pdf`,
            content: pdfBuffer // The helper function will automatically base64 encode this
        };

        // 7. Fire the API
        await sendEmailViaAPI(
            userEmail, 
            userName, 
            `Your Ticket Confirmed: ${booking.showSnapshot.movieTitle}`, 
            emailBodyHtml, 
            attachment
        );

    } catch (error) {
        console.error('Failed to send booking email:', error);
    }
};

// --- CANCELLATION EMAIL CONTROLLER ---
export const sendCancellationEmail = async (userName, userEmail, booking, refundData) => {
    try {
        const emailBodyHtml = `
            <h3>Cancellation Confirmed</h3>
            <p>Hi ${userName}, </p>
            <p>Your booking for <strong>${booking.showSnapshot.movieTitle}</strong> (Booking ID: ${booking._id.toString().slice(-6).toUpperCase()}) has been cancelled.</p>
            
            <div style="background-color: #f9fafb; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Refund Details:</strong></p>
                <p style="margin: 0; color: #16a34a; font-weight: bold; font-size: 18px;">Amount: ₹${refundData.refundAmount}</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Refund ID: ${refundData.refundId || 'N/A'}</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">Please note that refunds typically take 5-7 business days to reflect in your original payment method.</p>
            <br/>
            <p>We hope to see you again soon!</p>
            <p>The CineFlix Team</p>
        `;

        await sendEmailViaAPI(
            userEmail, 
            userName, 
            `Booking Cancelled: ${booking.showSnapshot.movieTitle}`, 
            emailBodyHtml
        );

    } catch (error) {
        console.error('Failed to send cancellation email:', error);
    }
};