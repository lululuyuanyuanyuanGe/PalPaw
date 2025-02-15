import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

export default function RecruitBoard() {
    const [notices, setNotices] = useState([]);

    const getNotices = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/notice/getnotice');
            const result = await response.json();
            console.log("Fetched Notices:", result);
            if (result.latestNotice && Array.isArray(result.latestNotice)) {
                setNotices(result.latestNotice);
            } else {
                setNotices([]);
            }
        } catch (error) {
            console.error("An error occurred while getting notices:", error);
            setNotices([]);
        }
    };

    // get notices every 5 seconds
    useEffect(() => {
        getNotices();
        const interval = setInterval(getNotices, 5000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Recruit Board</Text>
            {notices.length === 0 ? (
                <Text style={styles.noNotice}>Waiting for the first recruit notice.....</Text>
            ) : (
                <FlatList
                    data={notices}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <View style={styles.noticeCard}>
                            <Text style={styles.centerName}>{item.centername}</Text>
                            <Text style={styles.noticeContent}>{item.content}</Text>
                            <Text style={styles.timestamp}>{timeHandler(item.notifytime)}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

//timestamps
const timeHandler = (notifytime) => {
    const date = new Date(notifytime);
    return date.toLocaleString();
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20, 
        backgroundColor: '#eeeee4',
        alignItems: 'center', 
        justifyContent: 'center'
    },
    header: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: '#c98a3f', 
        marginBottom: 15 
    },
    noNotice: { 
        fontSize: 16, 
        color: '#888', 
        textAlign: 'center', 
        marginTop: 20 
    },
    noticeCard: { 
        backgroundColor: '#fff', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 10, 
        width: '100%',
        alignSelf: 'center',
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowRadius: 4, 
        elevation: 3 
    },
    centerName: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#333' 
    },
    noticeContent: { 
        fontSize: 18, 
        color: '#555', 
        marginTop: 8, 
        textAlign: 'left'
    },
    timestamp: { 
        fontSize: 14, 
        color: '#999', 
        marginTop: 5, 
        textAlign: 'right' 
    }
});