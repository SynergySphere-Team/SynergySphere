import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type {
  CommunityChannel,
  CommunityChatMessage,
  CommunityQAPost,
  CommunityQAReply,
  CommunityPostDetail,
} from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getInitials(first = '', last = '') {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || 'U';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  firstName,
  lastName,
  size = 32,
  accentColor,
}: {
  firstName: string;
  lastName: string;
  size?: number;
  accentColor: string;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accentColor,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { fontSize: size * 0.38, color: '#07180d' },
        ]}
      >
        {getInitials(firstName, lastName)}
      </Text>
    </View>
  );
}

function QuotedReplyBox({
  firstName,
  lastName,
  body,
  colors,
  accentColor,
}: {
  firstName: string;
  lastName: string;
  body: string;
  colors: any;
  accentColor: string;
}) {
  return (
    <View
      style={[
        styles.quoteBox,
        {
          backgroundColor: colors.surfaceElevated,
          borderLeftColor: accentColor,
        },
      ]}
    >
      <View style={styles.quoteHeader}>
        <Ionicons name="return-down-back" size={13} color={accentColor} />
        <Text style={[styles.quoteAuthor, { color: accentColor }]}>
          {firstName} {lastName}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={[styles.quoteBody, { color: colors.muted }]}
      >
        {body}
      </Text>
    </View>
  );
}

// ─── Chat View ────────────────────────────────────────────────────────────────

function ChatChannelView({
  channel,
  currentUserId,
  accentColor,
}: {
  channel: CommunityChannel;
  currentUserId: string;
  accentColor: string;
}) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [messages, setMessages] = useState<CommunityChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<CommunityChatMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.get<CommunityChatMessage[]>(
        `/community-chat/channels/${channel.id}/messages`
      );
      setMessages(data);
    } catch {
      // Keep existing on poll error
    } finally {
      setLoading(false);
    }
  }, [channel.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setReplyTo(null);
    setInput('');
    loadMessages();

    pollTimerRef.current = setInterval(loadMessages, 4000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [channel.id, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const created = await api.post<CommunityChatMessage>(
        `/community-chat/channels/${channel.id}/messages`,
        { body: input.trim(), replyToId: replyTo?.id }
      );
      setMessages((prev) => [...prev, created]);
      setInput('');
      setReplyTo(null);
    } catch {
      // error handling handled gracefully
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.flexOne}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading #{channel.name} messages...
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageListContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color={accentColor}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Welcome to #{channel.name}!
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {channel.description ||
                  'No messages here yet. Be the first to start the conversation!'}
              </Text>
            </View>
          ) : (
            messages.map((msg, idx) => {
              const prev = messages[idx - 1];
              const isMine = msg.userId === currentUserId;
              const isSameUser =
                prev && prev.userId === msg.userId && !msg.replyToId;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isSameUser ? styles.messageRowCompact : styles.messageRowSpaced,
                  ]}
                >
                  {!isSameUser ? (
                    <Avatar
                      firstName={msg.firstName}
                      lastName={msg.lastName}
                      accentColor={accentColor}
                      size={32}
                    />
                  ) : (
                    <View style={styles.avatarSpacer} />
                  )}

                  <View style={styles.messageBubbleContainer}>
                    {!isSameUser ? (
                      <View style={styles.messageAuthorRow}>
                        <Text
                          style={[
                            styles.authorName,
                            { color: isMine ? accentColor : colors.text },
                          ]}
                        >
                          {isMine ? 'You' : `${msg.firstName} ${msg.lastName}`}
                        </Text>
                        <Text
                          style={[styles.timestamp, { color: colors.muted }]}
                        >
                          {formatTime(msg.createdAt)}
                        </Text>
                      </View>
                    ) : null}

                    {msg.replyToId &&
                    msg.replyToBody &&
                    msg.replyToFirstName ? (
                      <QuotedReplyBox
                        firstName={msg.replyToFirstName}
                        lastName={msg.replyToLastName || ''}
                        body={msg.replyToBody}
                        colors={colors}
                        accentColor={accentColor}
                      />
                    ) : null}

                    <View
                      style={[
                        styles.messageCard,
                        {
                          backgroundColor: isMine
                            ? isLight
                              ? '#E7F7E3'
                              : colors.primaryDark
                            : colors.surface,
                          borderColor: isMine ? accentColor : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageBodyText,
                          { color: colors.text },
                        ]}
                      >
                        {msg.body}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setReplyTo(msg)}
                      hitSlop={8}
                      style={styles.replyButton}
                    >
                      <Ionicons
                        name="return-down-back-outline"
                        size={13}
                        color={colors.muted}
                      />
                      <Text
                        style={[styles.replyButtonText, { color: colors.muted }]}
                      >
                        Reply
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Reply Banner */}
      {replyTo ? (
        <View
          style={[
            styles.replyBanner,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopColor: accentColor,
            },
          ]}
        >
          <View style={styles.replyBannerContent}>
            <Ionicons name="return-down-back" size={14} color={accentColor} />
            <Text
              numberOfLines={1}
              style={[styles.replyBannerText, { color: colors.text }]}
            >
              Replying to{' '}
              <Text style={{ fontWeight: '700', color: accentColor }}>
                {replyTo.firstName} {replyTo.lastName}
              </Text>
              : {replyTo.body}
            </Text>
          </View>
          <Pressable
            onPress={() => setReplyTo(null)}
            hitSlop={8}
            style={styles.replyBannerClose}
          >
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      {/* Input row */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Message #${channel.name}...`}
          placeholderTextColor={colors.placeholderText}
          multiline
          maxLength={4000}
          style={[
            styles.chatInput,
            {
              color: colors.text,
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
            },
          ]}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || sending}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                input.trim() && !sending ? accentColor : colors.surfaceElevated,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#07180d" />
          ) : (
            <Ionicons
              name="send"
              size={17}
              color={input.trim() ? '#07180d' : colors.muted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Q&A Forum View ───────────────────────────────────────────────────────────

function QAChannelView({
  channel,
  currentUserId,
  accentColor,
}: {
  channel: CommunityChannel;
  currentUserId: string;
  accentColor: string;
}) {
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';

  const [posts, setPosts] = useState<CommunityQAPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Question modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('');
  const [posting, setPosting] = useState(false);

  // Reply state in detail view
  const [replyInput, setReplyInput] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityQAReply | null>(null);
  const [replying, setReplying] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const data = await api.get<CommunityQAPost[]>(
        `/community-chat/channels/${channel.id}/posts`
      );
      setPosts(data);
    } catch {
      // graceful fallback
    } finally {
      setLoading(false);
    }
  }, [channel.id]);

  const loadPostDetail = useCallback(async (postId: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.get<CommunityPostDetail>(
        `/community-chat/posts/${postId}`
      );
      setSelectedPost(data);
    } catch {
      // graceful fallback
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setSelectedPost(null);
    loadPosts();
  }, [channel.id, loadPosts]);

  async function handleCreatePost() {
    if (!newTitle.trim() || !newBody.trim() || posting) return;
    setPosting(true);
    try {
      await api.post(`/community-chat/channels/${channel.id}/posts`, {
        title: newTitle.trim(),
        body: newBody.trim(),
        tags: newTags.trim() || undefined,
      });
      setNewTitle('');
      setNewBody('');
      setNewTags('');
      setShowAskModal(false);
      await loadPosts();
    } catch {
      // handle error
    } finally {
      setPosting(false);
    }
  }

  async function handleSendReply() {
    if (!replyInput.trim() || !selectedPost || replying) return;
    setReplying(true);
    try {
      await api.post(`/community-chat/posts/${selectedPost.id}/replies`, {
        body: replyInput.trim(),
        replyToId: replyTo?.id,
      });
      setReplyInput('');
      setReplyTo(null);
      await loadPostDetail(selectedPost.id);
    } catch {
      // handle error
    } finally {
      setReplying(false);
    }
  }

  async function handleAcceptReply(replyId: string) {
    if (!selectedPost) return;
    try {
      await api.patch(
        `/community-chat/posts/${selectedPost.id}/replies/${replyId}/accept`
      );
      await loadPostDetail(selectedPost.id);
      await loadPosts();
    } catch {
      // handle error
    }
  }

  // ── Render Post Detail (Question + Answers Thread) ─────────────────────────
  if (selectedPost) {
    const isPostOwner = selectedPost.userId === currentUserId;

    return (
      <View style={styles.flexOne}>
        {/* Detail Header */}
        <View
          style={[
            styles.detailHeader,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => setSelectedPost(null)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={19} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>
              Questions
            </Text>
          </Pressable>

          {selectedPost.isSolved ? (
            <View
              style={[
                styles.solvedBadge,
                { backgroundColor: isLight ? '#E7F7E3' : '#143818' },
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color={accentColor} />
              <Text style={[styles.solvedText, { color: accentColor }]}>
                Solved
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView
          style={styles.messageScroll}
          contentContainerStyle={styles.qaDetailContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Main Question Card */}
          <View
            style={[
              styles.qaCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.qaCardHeader}>
              <Avatar
                firstName={selectedPost.firstName}
                lastName={selectedPost.lastName}
                accentColor={accentColor}
                size={34}
              />
              <View style={styles.qaCardAuthorMeta}>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {selectedPost.firstName} {selectedPost.lastName}
                </Text>
                <Text style={[styles.timestamp, { color: colors.muted }]}>
                  Asked on {formatDate(selectedPost.createdAt)}
                </Text>
              </View>
            </View>

            <Text style={[styles.qaDetailTitle, { color: colors.text }]}>
              {selectedPost.title}
            </Text>

            <Text style={[styles.qaDetailBody, { color: colors.text }]}>
              {selectedPost.body}
            </Text>

            {selectedPost.tags ? (
              <View style={styles.tagWrap}>
                {selectedPost.tags.split(',').map((t, idx) => {
                  const tag = t.trim();
                  if (!tag) return null;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.tagPill,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: accentColor }]}>
                        #{tag}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Answers Heading */}
          <View style={styles.answersSectionHeader}>
            <Text style={[styles.answersTitle, { color: colors.text }]}>
              {selectedPost.replies.length}{' '}
              {selectedPost.replies.length === 1 ? 'Answer' : 'Answers'}
            </Text>
          </View>

          {/* Answers List */}
          {selectedPost.replies.length === 0 ? (
            <View
              style={[
                styles.emptyRepliesCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={28}
                color={colors.muted}
              />
              <Text style={[styles.emptyRepliesText, { color: colors.muted }]}>
                No answers yet. Share your knowledge below!
              </Text>
            </View>
          ) : (
            selectedPost.replies.map((reply) => {
              const isMyReply = reply.userId === currentUserId;
              return (
                <View
                  key={reply.id}
                  style={[
                    styles.replyCard,
                    {
                      backgroundColor: reply.isAccepted
                        ? isLight
                          ? '#F1FAF0'
                          : '#0d2413'
                        : colors.surface,
                      borderColor: reply.isAccepted
                        ? accentColor
                        : colors.border,
                      borderWidth: reply.isAccepted ? 1.5 : 1,
                    },
                  ]}
                >
                  {reply.isAccepted ? (
                    <View style={styles.acceptedAnswerBanner}>
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={accentColor}
                      />
                      <Text
                        style={[
                          styles.acceptedAnswerText,
                          { color: accentColor },
                        ]}
                      >
                        Accepted Answer
                      </Text>
                    </View>
                  ) : null}

                  {reply.replyToId &&
                  reply.replyToBody &&
                  reply.replyToFirstName ? (
                    <QuotedReplyBox
                      firstName={reply.replyToFirstName}
                      lastName={reply.replyToLastName || ''}
                      body={reply.replyToBody}
                      colors={colors}
                      accentColor={accentColor}
                    />
                  ) : null}

                  <View style={styles.qaCardHeader}>
                    <Avatar
                      firstName={reply.firstName}
                      lastName={reply.lastName}
                      accentColor={accentColor}
                      size={28}
                    />
                    <View style={styles.qaCardAuthorMeta}>
                      <Text
                        style={[
                          styles.authorName,
                          { color: isMyReply ? accentColor : colors.text },
                        ]}
                      >
                        {isMyReply
                          ? 'You'
                          : `${reply.firstName} ${reply.lastName}`}
                      </Text>
                      <Text
                        style={[styles.timestamp, { color: colors.muted }]}
                      >
                        {formatDate(reply.createdAt)} at{' '}
                        {formatTime(reply.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.replyBodyText, { color: colors.text }]}>
                    {reply.body}
                  </Text>

                  {/* Reply actions */}
                  <View style={styles.replyActionsRow}>
                    <Pressable
                      onPress={() => setReplyTo(reply)}
                      hitSlop={8}
                      style={[
                        styles.actionPill,
                        { backgroundColor: colors.surfaceElevated },
                      ]}
                    >
                      <Ionicons
                        name="return-down-back-outline"
                        size={13}
                        color={colors.muted}
                      />
                      <Text
                        style={[styles.actionPillText, { color: colors.muted }]}
                      >
                        Reply
                      </Text>
                    </Pressable>

                    {isPostOwner && !reply.isAccepted ? (
                      <Pressable
                        onPress={() => handleAcceptReply(reply.id)}
                        hitSlop={8}
                        style={[
                          styles.actionPill,
                          {
                            backgroundColor: isLight ? '#E7F7E3' : '#143818',
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={13}
                          color={accentColor}
                        />
                        <Text
                          style={[
                            styles.actionPillText,
                            { color: accentColor },
                          ]}
                        >
                          Accept Solution
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Quoting banner for answers */}
        {replyTo ? (
          <View
            style={[
              styles.replyBanner,
              {
                backgroundColor: colors.surfaceElevated,
                borderTopColor: accentColor,
              },
            ]}
          >
            <View style={styles.replyBannerContent}>
              <Ionicons name="return-down-back" size={14} color={accentColor} />
              <Text
                numberOfLines={1}
                style={[styles.replyBannerText, { color: colors.text }]}
              >
                Replying to{' '}
                <Text style={{ fontWeight: '700', color: accentColor }}>
                  {replyTo.firstName} {replyTo.lastName}
                </Text>
                : {replyTo.body}
              </Text>
            </View>
            <Pressable
              onPress={() => setReplyTo(null)}
              hitSlop={8}
              style={styles.replyBannerClose}
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}

        {/* Answer input */}
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TextInput
            value={replyInput}
            onChangeText={setReplyInput}
            placeholder="Write your answer or solution..."
            placeholderTextColor={colors.placeholderText}
            multiline
            maxLength={4000}
            style={[
              styles.chatInput,
              {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
              },
            ]}
          />
          <Pressable
            onPress={handleSendReply}
            disabled={!replyInput.trim() || replying}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  replyInput.trim() && !replying
                    ? accentColor
                    : colors.surfaceElevated,
              },
            ]}
          >
            {replying ? (
              <ActivityIndicator size="small" color="#07180d" />
            ) : (
              <Ionicons
                name="send"
                size={17}
                color={replyInput.trim() ? '#07180d' : colors.muted}
              />
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Render Questions List ──────────────────────────────────────────────────
  return (
    <View style={styles.flexOne}>
      {/* Forum Actions Header */}
      <View
        style={[
          styles.forumHeaderRow,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.forumCounter, { color: colors.muted }]}>
          {posts.length} {posts.length === 1 ? 'Question' : 'Questions'}
        </Text>
        <Pressable
          onPress={() => setShowAskModal(true)}
          style={[styles.askButton, { backgroundColor: accentColor }]}
        >
          <Ionicons name="add" size={16} color="#07180d" />
          <Text style={styles.askButtonText}>Ask Question</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading #{channel.name} questions...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.messageScroll}
          contentContainerStyle={styles.qaListContent}
          nestedScrollEnabled
        >
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={32}
                  color={accentColor}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No questions yet in #{channel.name}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Stuck on a bug, challenge, or concept? Ask your question and get
                answers from mentors and peers.
              </Text>
              <Pressable
                onPress={() => setShowAskModal(true)}
                style={[
                  styles.askButton,
                  { backgroundColor: accentColor, marginTop: 16 },
                ]}
              >
                <Ionicons name="add" size={16} color="#07180d" />
                <Text style={styles.askButtonText}>Ask the First Question</Text>
              </Pressable>
            </View>
          ) : (
            posts.map((post) => {
              const tags = post.tags
                ? post.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                : [];

              return (
                <Pressable
                  key={post.id}
                  onPress={() => loadPostDetail(post.id)}
                  style={({ pressed }) => [
                    styles.postCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.postCardHeaderRow}>
                    <View style={styles.tagWrap}>
                      {post.isSolved ? (
                        <View
                          style={[
                            styles.solvedBadge,
                            {
                              backgroundColor: isLight ? '#E7F7E3' : '#143818',
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color={accentColor}
                          />
                          <Text
                            style={[styles.solvedText, { color: accentColor }]}
                          >
                            Solved
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.openBadge,
                            { backgroundColor: colors.surfaceElevated },
                          ]}
                        >
                          <Text
                            style={[styles.openBadgeText, { color: colors.muted }]}
                          >
                            Open
                          </Text>
                        </View>
                      )}

                      {tags.map((tag, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.tagPill,
                            {
                              backgroundColor: colors.surfaceElevated,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.tagText, { color: accentColor }]}>
                            #{tag}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[styles.postTitleText, { color: colors.text }]}
                  >
                    {post.title}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={[styles.postBodySnippet, { color: colors.muted }]}
                  >
                    {post.body}
                  </Text>

                  <View style={styles.postFooterRow}>
                    <Text style={[styles.postFooterMeta, { color: colors.muted }]}>
                      {post.firstName} {post.lastName} •{' '}
                      {formatDate(post.createdAt)}
                    </Text>

                    <View style={styles.replyCountBadge}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={13}
                        color={accentColor}
                      />
                      <Text
                        style={[
                          styles.replyCountText,
                          { color: colors.text },
                        ]}
                      >
                        {post.replyCount || 0}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Ask Question Modal */}
      <Modal
        visible={showAskModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAskModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Ask a Question
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Post to #{channel.name}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowAskModal(false)}
                hitSlop={8}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Question Title *
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. How do I fix CORS issues in Express?"
                placeholderTextColor={colors.placeholderText}
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Details & Context *
              </Text>
              <TextInput
                value={newBody}
                onChangeText={setNewBody}
                placeholder="Describe your issue, code snippets, or error messages in detail..."
                placeholderTextColor={colors.placeholderText}
                multiline
                numberOfLines={5}
                style={[
                  styles.formTextArea,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Tags (comma-separated)
              </Text>
              <TextInput
                value={newTags}
                onChangeText={setNewTags}
                placeholder="e.g. react, node, api"
                placeholderTextColor={colors.placeholderText}
                style={[
                  styles.formInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
              />

              <View style={styles.modalActionsRow}>
                <Pressable
                  onPress={() => setShowAskModal(false)}
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleCreatePost}
                  disabled={!newTitle.trim() || !newBody.trim() || posting}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor:
                        newTitle.trim() && newBody.trim() && !posting
                          ? accentColor
                          : colors.surfaceElevated,
                    },
                  ]}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="#07180d" />
                  ) : (
                    <Text
                      style={[
                        styles.submitBtnText,
                        {
                          color:
                            newTitle.trim() && newBody.trim()
                              ? '#07180d'
                              : colors.muted,
                        },
                      ]}
                    >
                      Post Question
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Main CommunityChat Component ─────────────────────────────────────────────

export function CommunityChat() {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const isLight = theme === 'light';
  const accentColor = isLight ? '#1e6827' : colors.primary;

  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<CommunityChannel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await api.get<CommunityChannel[]>('/community-chat/channels');
      setChannels(data);
      if (data.length > 0 && !activeChannel) {
        setActiveChannel(data[0]);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [activeChannel]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  if (!user) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* ── Channel Selector Bar ───────────────────────────────────────────── */}
      <View
        style={[
          styles.channelSelectorContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelScrollContent}
        >
          {loading ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            channels.map((ch) => {
              const isActive = activeChannel?.id === ch.id;
              const isQA = ch.type === 'qa';

              return (
                <Pressable
                  key={ch.id}
                  onPress={() => setActiveChannel(ch)}
                  style={[
                    styles.channelPill,
                    {
                      backgroundColor: isActive
                        ? isLight
                          ? '#E7F7E3'
                          : colors.primaryDark
                        : colors.surfaceElevated,
                      borderColor: isActive ? accentColor : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={isQA ? 'help-circle-outline' : 'chatbubble-ellipses-outline'}
                    size={14}
                    color={isActive ? accentColor : colors.muted}
                  />
                  <Text
                    style={[
                      styles.channelPillText,
                      {
                        color: isActive ? accentColor : colors.text,
                        fontWeight: isActive ? '800' : '600',
                      },
                    ]}
                  >
                    #{ch.name}
                  </Text>
                  {isQA ? (
                    <View
                      style={[
                        styles.qaMiniBadge,
                        { backgroundColor: isActive ? accentColor : colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.qaMiniBadgeText,
                          { color: isActive ? '#07180d' : colors.text },
                        ]}
                      >
                        Q&A
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ── Active Channel Info Header ───────────────────────────────────────── */}
      {activeChannel ? (
        <View
          style={[
            styles.activeChannelHeader,
            {
              backgroundColor: colors.surfaceElevated,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.activeChannelTitleRow}>
            <Ionicons
              name={
                activeChannel.type === 'qa'
                  ? 'help-circle'
                  : 'chatbubble-ellipses'
              }
              size={16}
              color={accentColor}
            />
            <Text
              style={[styles.activeChannelName, { color: colors.text }]}
            >
              #{activeChannel.name}
            </Text>
            <Text
              style={[
                styles.channelTypeTag,
                { color: accentColor, backgroundColor: isLight ? '#E7F7E3' : '#143818' },
              ]}
            >
              {activeChannel.type === 'qa' ? 'Q&A Forum' : 'Chat'}
            </Text>
          </View>
          {activeChannel.description ? (
            <Text
              numberOfLines={1}
              style={[styles.activeChannelDesc, { color: colors.muted }]}
            >
              {activeChannel.description}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Active Channel Body ────────────────────────────────────────────── */}
      <View style={styles.channelBody}>
        {!activeChannel ? (
          <View style={styles.centerContainer}>
            <Text style={{ color: colors.muted }}>
              Select a channel above to begin chatting.
            </Text>
          </View>
        ) : activeChannel.type === 'qa' ? (
          <QAChannelView
            channel={activeChannel}
            currentUserId={user.id}
            accentColor={accentColor}
          />
        ) : (
          <ChatChannelView
            channel={activeChannel}
            currentUserId={user.id}
            accentColor={accentColor}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 520,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  flexOne: {
    flex: 1,
  },
  channelSelectorContainer: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  channelScrollContent: {
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  channelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  channelPillText: {
    fontSize: 13,
  },
  qaMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  qaMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  activeChannelHeader: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 2,
  },
  activeChannelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activeChannelName: {
    fontSize: 14,
    fontWeight: '800',
  },
  channelTypeTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activeChannelDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  channelBody: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  messageScroll: {
    flex: 1,
  },
  messageListContent: {
    padding: 12,
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageRowSpaced: {
    marginTop: 6,
  },
  messageRowCompact: {
    marginTop: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
  },
  avatarSpacer: {
    width: 32,
  },
  messageBubbleContainer: {
    flex: 1,
    gap: 3,
  },
  messageAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 10,
  },
  messageCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '96%',
  },
  messageBodyText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  replyButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quoteBox: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
    gap: 2,
    marginBottom: 2,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quoteAuthor: {
    fontSize: 10,
    fontWeight: '700',
  },
  quoteBody: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 2,
  },
  replyBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  replyBannerText: {
    fontSize: 11,
    flex: 1,
  },
  replyBannerClose: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Q&A specific
  forumHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  forumCounter: {
    fontSize: 12,
    fontWeight: '600',
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  askButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#07180d',
  },
  qaListContent: {
    padding: 12,
    gap: 10,
  },
  postCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  postCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  solvedText: {
    fontSize: 10,
    fontWeight: '800',
  },
  openBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  postTitleText: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 19,
  },
  postBodySnippet: {
    fontSize: 12,
    lineHeight: 16,
  },
  postFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  postFooterMeta: {
    fontSize: 11,
  },
  replyCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Detail
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
  },
  qaDetailContent: {
    padding: 12,
    gap: 12,
  },
  qaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  qaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  qaCardAuthorMeta: {
    gap: 1,
  },
  qaDetailTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  qaDetailBody: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  answersSectionHeader: {
    marginTop: 4,
    paddingHorizontal: 2,
  },
  answersTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyRepliesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptyRepliesText: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  replyCard: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  acceptedAnswerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  acceptedAnswerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  replyBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  replyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  formInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  formTextArea: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
