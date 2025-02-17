import { Injectable } from '@angular/core';
import {
  Firestore,
  addDoc,
  doc,
  updateDoc,
  collection,
  onSnapshot,
  setDoc,
  getDoc,
  query,
  getDocs,
  QuerySnapshot,
  where,
  docData,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private loggedInUserDataSubject = new BehaviorSubject<any>(null);
  private subscribedRecipientDataSubject = new BehaviorSubject<any>(null);
  public subscribedRecipientData$: Observable<any> =
    this.subscribedRecipientDataSubject.asObservable();
  private conversationDataDataSubject = new BehaviorSubject<any>(null);
  public conversationData$: Observable<any> =
    this.conversationDataDataSubject.asObservable();
  unsubUsers;
  unsubUserData: Function;
  public currentChannel;
  public channels = [];
  public allUsers = [];
  public emailsForReactions = [];
  private currentDate;
  public sorted = [];

  constructor(private firestore: Firestore) { }

  ngOnDestroy() {
    this.unsubUserData();
  }

  async getLogedInUserData(userId: string) {
    const docRef = this.getDocRef('users', userId);

    this.unsubUserData = onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        this.loggedInUserDataSubject.next(userData);
      } else return null;
    });

    return this.loggedInUserDataSubject.asObservable();
  }

  subscribeToPmRecipient(userId: string) {
    const docRef = this.getDocRef('users', userId);

    onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        this.subscribedRecipientDataSubject.next(docData);
      } else {
        this.subscribedRecipientDataSubject.next(null);
      }
    });
  }

  async subscribeToPMConversation(conversationID: string): Promise<void> {
    this.destroyConversationDataSubject();

    const docRef = this.getDocRef('pms', conversationID);
    this.conversationDataDataSubject = new BehaviorSubject<any>(null);

    onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const convData = snapshot.data();
        this.conversationDataDataSubject.next(convData);
      } else {
        this.conversationDataDataSubject.next(null);
      }
    });

    this.conversationData$ = this.conversationDataDataSubject.asObservable();
  }

  private destroyConversationDataSubject(): void {
    this.conversationDataDataSubject.complete();
  }

  async addNewConversation(data: {}) {
    const colRef = this.getColRef('pms');

    await addDoc(colRef, data);
  }

  async updateConversation(conversationID: string, data: {}) {
    const docRef = this.getDocRef('pms', conversationID);

    await setDoc(docRef, data);
  }

  async getPmsSnapshot() {
    const colRef = this.getColRef('pms');

    return await getDocs(colRef);
  }

  async newUser(data: {}, userId: string) {
    const userRef = this.getDocRef('users', userId);
    await setDoc(userRef, data);
  }

  getColRef(colName: string) {
    return collection(this.firestore, colName);
  }

  getDocRef(colName: string, docId: string) {
    return doc(this.getColRef(colName), docId);
  }

  async getCurrentChannel(colName: string, docId: string) {
    const channelRef = await getDoc(this.getDocRef(colName, docId));
    if (channelRef.exists()) {
      this.currentChannel = channelRef.data();
      this.currentChannel.messages = channelRef.data()['messages'];
    } else {
      console.error('Document does not exist');
      return null;
    }
  }

  async updateDocumentInFirebase() {
    await updateDoc(
      this.getDocRef('channels', this.currentChannel.id),
      this.currentChannel.toJson()
    );
  }

  ifChangesOnChannels() {
    const q = query(this.getColRef('channels'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        let channelToModifyIndex = this.channels.findIndex(
          (channel) => channel.name === change.doc.data()['name']
        );
        if (change.type === 'added') {
          if (channelToModifyIndex === -1)
            this.channels.push(change.doc.data());
        }
        if (change.type === 'modified') {
          if (channelToModifyIndex !== -1)
            this.channels[channelToModifyIndex] = change.doc.data();
        }
        if (change.type === 'removed') {
          this.channels.splice(channelToModifyIndex, 1);
        }
      });
    });
  }

  async readMessagesOfChannels() {
    if (this.currentChannel && this.currentChannel.id) {
      const unsub = onSnapshot(
        doc(this.firestore, 'channels', this.currentChannel.id),
        { includeMetadataChanges: true },
        (doc) => {
          this.currentChannel.messages = doc.data()['messages'];
          this.sortDates();
        }
      );
    }
  }

  async readAllUsers() {
    this.allUsers = [];
    const querySnapshot = await getDocs(collection(this.firestore, 'users'));
    querySnapshot.forEach((user) => {
      this.allUsers.push(user.data());
    });
  }

  dateNameChecker(creationDate) {
    if (creationDate !== this.getCurrentDate()) {
      return `${this.getDaysName()}, ` + `${creationDate}`;
    } else {
      return 'heute';
    }
  }

  sortDates() {
    if (this.currentChannel && this.currentChannel.messages) {
      this.sorted = this.currentChannel.messages.sort((a, b) => {
        let dateA = new Date(
          a.creationDate.split('.').reverse().join('.')
        ).getTime();
        let dateB = new Date(
          b.creationDate.split('.').reverse().join('.')
        ).getTime();
        return dateA - dateB;
      });
    }
  }

  isDifferentDate(creationDate, i: number): boolean {
    if (creationDate && i > 0) {
      return creationDate !== this.sorted[i - 1].creationDate;
    }
    return true;
  }

  getCurrentDate() {
    let datetime = new Date();
    this.currentDate =
      datetime.getDate() +
      '.' +
      (datetime.getMonth() + 1) +
      '.' +
      datetime.getFullYear();
    return this.currentDate;
  }

  getCurrentTime() {
    let datetime = new Date();
    let hours = datetime.getHours();
    let minutes = datetime.getMinutes();
    let formattedMinutes = (minutes < 10) ? '0' + minutes : minutes;
    let currentTime = `${hours}:${formattedMinutes}`;
    return currentTime;
  }

  getDaysName() {
    const weekday = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
    ];
    const d = new Date();
    let day = weekday[d.getDay()];
    return day;
  }

  getsMonthName() {
    const month = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const d = new Date();
    let name = month[d.getMonth()];
    return name;
  }
}
