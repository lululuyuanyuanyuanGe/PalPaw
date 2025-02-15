import React, { useEffect, useState } from 'react';
import { Button } from 'react-native';
import { View, Alert, StyleSheet } from 'react-native';

export default function PopupNotice() {
  const [displayedNotices, setDisplayedNotices] = useState(new Set());

  const getLatestNotices = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/notice/getnotice');
      const data = await response.json();

      console.log("Fetched notices:", data);

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((notice, index) => {
          // Prevent duplicate popups for the same notices
          if (!displayedNotices.has(notice._id)) {
            setTimeout(() => {
              Alert.alert(
                `📢 ${notice.centername}`,
                notice.content,
                [{ text: "Got it", onPress: () => (index + 1) }]
              );
              setDisplayedNotices(prev => new Set(prev).add(notice._id));
            }, index * 5000);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
    }
  };


  const showNotices = async (notices: string | any[]) => {
    for (let i = 0; i < notices.length; i++) {
      const notice = notices[i];
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  };


  useEffect(() => {
    getLatestNotices();
    const interval = setInterval(getLatestNotices, 5000);
    return () => clearInterval(interval);
  }, []);


  return ( 
    <View>
      <Button title="Show Alert" onPress={() => Alert.alert("Test", "This is a test alert!")} />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { display: 'none' },
});