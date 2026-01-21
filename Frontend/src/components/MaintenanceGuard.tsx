
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import UnderConstruction from '../pages/UnderConstruction';

const STORAGE_KEY = 'PROTOCOLOMED_DEV_ACCESS';

interface MaintenanceGuardProps {
    children: React.ReactNode;
}

const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Check local storage directly
    const hasAccess = localStorage.getItem(STORAGE_KEY) === 'true';
    const isDevUrl = searchParams.get('dev') === 'true';

    const [authorized, setAuthorized] = useState<boolean>(hasAccess);

    useEffect(() => {
        if (isDevUrl) {
            // Grant access
            localStorage.setItem(STORAGE_KEY, 'true');
            setAuthorized(true);

            // Clean URL implies removing ?dev=true
            searchParams.delete('dev');

            // Navigate to same path without query param to clean up URL visually
            // Use replace to avoid history stack buildup
            navigate({
                pathname: location.pathname,
                search: searchParams.toString()
            }, { replace: true });
        }
    }, [isDevUrl, navigate, location.pathname, searchParams]);

    if (authorized) {
        return <>{children}</>;
    }

    return <UnderConstruction />;
};

export default MaintenanceGuard;
