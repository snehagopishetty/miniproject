/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import 'bootstrap/dist/css/bootstrap.min.css';
import './UserDashboard.css'; // Import the CSS file

export default function UserDashboard() {
    const [issue, setIssue] = useState('');
    const [location, setLocation] = useState({ lat: null, lng: null, address: '' });
    const [user, setUser] = useState({ name: '', phone: '' });
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUserData = () => {
            const name = localStorage.getItem('name') || '';
            const phone = localStorage.getItem('phone') || '';
            setUser({ name, phone });
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        const fetchIssues = async () => {
            setLoading(true);
            try {
                const response = await axios.get('http://localhost:8000/api/issue-status', {
                    params: { phone: user.phone },
                });
                if (response.status === 200 && response.data) {
                    setIssues(response.data);
                } else {
                    console.warn('Unexpected response status:', response.status);
                }
            } catch (error) {
                console.error('Error fetching issues:', error.response ? error.response.data : error.message);
                toast.error('An error occurred while fetching issues. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (user.phone) {
            fetchIssues();
        }
    }, [user.phone]);

    const handleLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    try {
                        const response = await axios.get(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
                        if (response.data && response.data.address) {
                            const address = [
                                response.data.address.road,
                                response.data.address.suburb,
                                response.data.address.city,
                                response.data.address.state,
                                response.data.address.country,
                                response.data.address.postcode
                            ].filter(Boolean).join(', ');

                            setLocation({ lat, lng, address });
                        } else {
                            toast.error('Location not found');
                        }
                    } catch (error) {
                        toast.error('Failed to fetch location');
                        console.error('Error fetching location:', error);
                    }
                },
                (error) => {
                    toast.error('Geolocation permission denied.');
                }
            );
        } else {
            toast.error('Geolocation is not supported by this browser.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!location.lat || !location.lng || !location.address) {
            toast.error('Please provide a valid location.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:8000/api/submit-issue', {
                issue,
                location,
                name: user.name,
                phone: user.phone,
            });

            if (response.data.success) {
                toast.success('Issue submitted successfully');
                setIssue('');
                setLocation({ lat: null, lng: null, address: '' });
                // Fetch issues again after submitting a new one
                const fetchIssues = async () => {
                    try {
                        const response = await axios.get('http://localhost:8000/api/issue-status', {
                            params: { phone: user.phone },
                        });
                        if (response.data) {
                            setIssues(response.data);
                        }
                    } catch (error) {
                        console.error('Error fetching issues:', error);
                        toast.error('An error occurred while fetching issues');
                    }
                };
                fetchIssues();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error('Error submitting issue:', error);
            toast.error('An error occurred while submitting the issue');
        }
    };

    const handleCloseIssue = async (issueId) => {
        try {
            const response = await axios.post('http://localhost:8000/api/close-issue', {
                issueId,
            });

            if (response.data.success) {
                toast.success('Issue closed successfully');
                setIssues(issues.map(issue => 
                    issue._id === issueId ? { ...issue, status: 'closed' } : issue
                ));
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error('Error closing issue:', error);
            toast.error('An error occurred while closing the issue');
        }
    };

    return (
        <div className="full-page-containervh-100 vw-100 container-fluid d-flex flex-column align-items-center justify-content-center bg-secondary">
            <div className="card-container d-flex align-items-center justify-content-center vh-100 vw-100 container-fluid">
                <div className="card p-5 bg-dark text-white w-75">
                    <h2 className="text-center mb-4">Submit an Issue</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-3">
                            <label htmlFor="issue">Issue</label>
                            <textarea
                                className="form-control"
                                id="issue"
                                rows="3"
                                placeholder="Describe your issue"
                                value={issue}
                                onChange={(e) => setIssue(e.target.value)}
                                required
                            ></textarea>
                        </div>
                        <div className="form-group mb-3">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleLocation}
                            >
                                Get Location
                            </button>
                            {location.lat && location.lng && (
                                <p className="mt-2">
                                    Location: {location.address || `${location.lat}, ${location.lng}`}
                                </p>
                            )}
                        </div>
                        <button type="submit" className="btn btn-primary w-100">Submit</button>
                    </form>
                    {loading ? (
                        <div className="text-center mt-4">
                            <div className="spinner-border text-light" role="status">
                                <span className="sr-only">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        issues.length > 0 && (
                            <div className="mt-4 issues-container">
                                <h3>Issues</h3>
                                <ul className="list-unstyled">
                                    {issues.map((issueItem, index) => (
                                        <li key={index} className="mb-3 p-3 border rounded bg-light text-dark">
                                            <h4>Issue: {issueItem.issue}</h4>
                                            <p>Status: {issueItem.status}</p>
                                            {issueItem.status === 'accepted' && issueItem.acceptedBy && (
                                                <div>
                                                    <h5>Accepted by:</h5>
                                                    <p>
                                                        {issueItem.acceptedBy.name} - {issueItem.acceptedBy.number} - {issueItem.acceptedBy.location}
                                                    </p>
                                                </div>
                                            )}
                                            {issueItem.status !== 'closed' && (
                                                <button
                                                    className="btn btn-danger mt-2"
                                                    onClick={() => handleCloseIssue(issueItem._id)}
                                                >
                                                    Close Issue
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
