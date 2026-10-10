import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';

import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

type CommunityChannel = {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
};

type CommunityMessage = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
};

type FeedPost = {
  id: string;
  userId: string;
  body: string;
  linkUrl?: string | null;
  postType?: 'POST' | 'QUESTION' | 'PROJECT';
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  profilePicture?: string | null;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
};

type FeedComment = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
};

function displayName(
  firstName?: string | null,
  lastName?: string | null,
) {
  return (
    [firstName, lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    'Community member'
  );
}

function initials(
  firstName?: string | null,
  lastName?: string | null,
) {
  return (
    [firstName?.[0], lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    'S'
  );
}

function timeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (Date.now() -
        date.getTime()) /
        1000,
    ),
  );

  if (seconds < 60) {
    return 'Just now';
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString();
}

function Avatar({
  firstName,
  lastName,
  picture,
  size = 38,
}: {
  firstName?: string | null;
  lastName?: string | null;
  picture?: string | null;
  size?: number;
}) {
  const {
    colors,
    theme,
  } = useTheme();

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  if (picture) {
    return (
      <Image
        source={{
          uri: picture,
        }}
        contentFit="cover"
        style={{
          width: size,
          height: size,
          borderRadius:
            size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius:
            size / 2,
          backgroundColor:
            colors.surfaceElevated,
          borderColor:
            colors.border,
        },
      ]}
    >
      <Text
        style={{
          color:
            accentColor,
          fontWeight:
            '900',
        }}
      >
        {initials(
          firstName,
          lastName,
        )}
      </Text>
    </View>
  );
}

function LiveChat() {
  const { user } = useAuth();

  const {
    colors,
    theme,
  } = useTheme();

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const [
    channels,
    setChannels,
  ] =
    useState<
      CommunityChannel[]
    >([]);

  const [
    activeChannel,
    setActiveChannel,
  ] =
    useState<
      CommunityChannel | null
    >(null);

  const [
    messages,
    setMessages,
  ] =
    useState<
      CommunityMessage[]
    >([]);

  const [
    loadingChannels,
    setLoadingChannels,
  ] =
    useState(true);

  const [
    loadingMessages,
    setLoadingMessages,
  ] =
    useState(false);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    draft,
    setDraft,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const loadChannels =
    useCallback(
      async () => {
        try {
          setError('');

          const result =
            await api.get<
              CommunityChannel[]
            >(
              '/community-chat/channels',
            );

          const safeChannels =
            Array.isArray(result)
              ? result
              : [];

          setChannels(
            safeChannels,
          );

          setActiveChannel(
            (
              current,
            ) => {
              if (
                current &&
                safeChannels.some(
                  (
                    channel,
                  ) =>
                    channel.id ===
                    current.id,
                )
              ) {
                return current;
              }

              return (
                safeChannels.find(
                  (
                    channel,
                  ) =>
                    channel.type !==
                    'qa',
                ) ??
                safeChannels[0] ??
                null
              );
            },
          );
        } catch (e) {
          setChannels([]);
          setActiveChannel(
            null,
          );

          setError(
            e instanceof Error
              ? e.message
              : 'Could not load Community channels.',
          );
        } finally {
          setLoadingChannels(
            false,
          );
        }
      },
      [],
    );

  const loadMessages =
    useCallback(
      async (
        targetChannel: CommunityChannel,
      ) => {
        try {
          setLoadingMessages(
            true,
          );

          setError('');

          if (targetChannel.type === 'qa') {
            const result =
              await api.get<any[]>(
                `/community-chat/channels/${targetChannel.id}/posts`,
              );

            const safePosts = Array.isArray(result) ? result : [];
            const mapped: CommunityMessage[] = safePosts.map((p) => ({
              id: p.id,
              userId: p.userId,
              body: p.title ? `📌 ${p.title}\n${p.body}` : p.body,
              createdAt: p.createdAt,
              firstName: p.firstName,
              lastName: p.lastName,
            }));

            setMessages(mapped);
          } else {
            const result =
              await api.get<
                CommunityMessage[]
              >(
                `/community-chat/channels/${targetChannel.id}/messages`,
              );

            setMessages(
              Array.isArray(result)
                ? result
                : [],
            );
          }
        } catch (e) {
          setMessages([]);

          setError(
            e instanceof Error
              ? e.message
              : 'Could not load messages.',
          );
        } finally {
          setLoadingMessages(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (!activeChannel) {
      setMessages([]);
      return;
    }

    setDraft('');

    loadMessages(
      activeChannel,
    );
  }, [
    activeChannel,
    loadMessages,
  ]);

  async function sendMessage() {
    const body =
      draft.trim();

    if (
      !body ||
      !activeChannel ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setError('');

      if (activeChannel.type === 'qa') {
        const title =
          body.length > 80
            ? body.slice(0, 80) + '...'
            : body.length < 3
              ? `${body} (Question)`
              : body;

        const createdPost =
          await api.post<any>(
            `/community-chat/channels/${activeChannel.id}/posts`,
            {
              title,
              body,
            },
          );

        if (createdPost && createdPost.id) {
          const mappedPost: CommunityMessage = {
            id: createdPost.id,
            userId: createdPost.userId || user?.id || '',
            body: createdPost.title ? `📌 ${createdPost.title}\n${createdPost.body}` : createdPost.body,
            createdAt: createdPost.createdAt || new Date().toISOString(),
            firstName: createdPost.firstName || user?.firstName,
            lastName: createdPost.lastName || user?.lastName,
          };
          setMessages((current) => [...current, mappedPost]);
        } else {
          await loadMessages(activeChannel);
        }
      } else {
        const created =
          await api.post<
            CommunityMessage
          >(
            `/community-chat/channels/${activeChannel.id}/messages`,
            {
              body,
            },
          );

        if (
          created &&
          created.id
        ) {
          setMessages(
            (
              current,
            ) => [
              ...current,
              created,
            ],
          );
        } else {
          await loadMessages(
            activeChannel,
          );
        }
      }

      setDraft('');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not send your message.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <View
      style={[
        styles.chatCard,
        {
          backgroundColor:
            colors.surface,
          borderColor:
            colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.chatHeading,
          {
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <View
          style={{
            flex: 1,
            gap: 3,
          }}
        >
          <Text
            style={[
              styles.cardTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Live Chat
          </Text>

          <Text
            style={[
              styles.cardText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            Choose a channel and chat with the Community.
          </Text>
        </View>

        {activeChannel ? (
          <Pressable
            accessibilityLabel="Refresh messages"
            onPress={() =>
              loadMessages(
                activeChannel,
              )
            }
            style={[
              styles.iconButton,
              {
                backgroundColor:
                  colors.surfaceElevated,
              },
            ]}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={
                accentColor
              }
            />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.channelsSection,
          {
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        {loadingChannels ? (
          <View
            style={
              styles.loadingRow
            }
          >
            <ActivityIndicator
              size="small"
              color={
                accentColor
              }
            />

            <Text
              style={{
                color:
                  colors.muted,
              }}
            >
              Loading channels...
            </Text>
          </View>
        ) : channels.length ===
          0 ? (
          <Text
            style={[
              styles.cardText,
              {
                color:
                  colors.muted,
                paddingHorizontal:
                  12,
              },
            ]}
          >
            No Community channels are available yet.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.channelRow
            }
          >
            {channels.map(
              (
                channel,
              ) => {
                const active =
                  activeChannel?.id ===
                  channel.id;

                return (
                  <Pressable
                    key={
                      channel.id
                    }
                    onPress={() =>
                      setActiveChannel(
                        channel,
                      )
                    }
                    style={[
                      styles.channelPill,
                      {
                        backgroundColor:
                          active
                            ? colors.surfaceElevated
                            : colors.surface,

                        borderColor:
                          active
                            ? accentColor
                            : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        channel.type ===
                        'qa'
                          ? 'help-circle-outline'
                          : 'chatbubble-ellipses-outline'
                      }
                      size={
                        14
                      }
                      color={
                        active
                          ? accentColor
                          : colors.muted
                      }
                    />

                    <Text
                      style={[
                        styles.channelText,
                        {
                          color:
                            active
                              ? accentColor
                              : colors.text,
                        },
                      ]}
                    >
                      #
                      {
                        channel.name
                      }
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        )}
      </View>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor:
                colors.surfaceElevated,
              borderBottomColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color="#B3261E"
          />

          <Text
            style={[
              styles.errorText,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {error}
          </Text>

          <Pressable
            onPress={() =>
              setError('')
            }
          >
            <Ionicons
              name="close"
              size={17}
              color={
                colors.muted
              }
            />
          </Pressable>
        </View>
      ) : null}

      <View
        style={
          styles.messagesArea
        }
      >
        {!activeChannel ? (
          <View
            style={
              styles.emptyState
            }
          >
            <Ionicons
              name="chatbubbles-outline"
              size={32}
              color={
                accentColor
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Choose a channel
            </Text>
          </View>
        ) : loadingMessages ? (
          <View
            style={
              styles.emptyState
            }
          >
            <ActivityIndicator
              color={
                accentColor
              }
            />

            <Text
              style={{
                color:
                  colors.muted,
              }}
            >
              Loading messages...
            </Text>
          </View>
        ) : messages.length ===
          0 ? (
          <View
            style={
              styles.emptyState
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={32}
              color={
                accentColor
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Welcome to #
              {
                activeChannel.name
              }
            </Text>

            <Text
              style={[
                styles.cardText,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              Be the first person to send a message.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={
              styles.messageScroll
            }
            contentContainerStyle={
              styles.messageList
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {messages.map(
              (
                message,
              ) => {
                const mine =
                  Boolean(
                    user?.id &&
                      message.userId ===
                        user.id,
                  );

                return (
                  <View
                    key={
                      message.id
                    }
                    style={[
                      styles.messageBlock,
                      mine && {
                        alignItems:
                          'flex-end',
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.messageMeta
                      }
                    >
                      <Text
                        style={[
                          styles.messageAuthor,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {mine
                          ? 'You'
                          : displayName(
                              message.firstName,
                              message.lastName,
                            )}
                      </Text>

                      <Text
                        style={[
                          styles.messageTime,
                          {
                            color:
                              colors.muted,
                          },
                        ]}
                      >
                        {timeLabel(
                          message.createdAt,
                        )}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.messageBubble,
                        {
                          backgroundColor:
                            mine
                              ? colors.surfaceElevated
                              : colors.surface,

                          borderColor:
                            mine
                              ? accentColor
                              : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {
                          message.body
                        }
                      </Text>
                    </View>
                  </View>
                );
              },
            )}
          </ScrollView>
        )}
      </View>

      <View
        style={[
          styles.composer,
          {
            borderTopColor:
              colors.border,
          },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={
            setDraft
          }
          multiline
          editable={
            Boolean(
              activeChannel,
            ) &&
            !sending
          }
          placeholder={
            activeChannel
              ? activeChannel.type === 'qa'
                ? `Ask a question in #${activeChannel.name}...`
                : `Message #${activeChannel.name}...`
              : 'Choose a channel first'
          }
          placeholderTextColor={
            colors.muted
          }
          style={[
            styles.messageInput,
            {
              color:
                colors.text,
              backgroundColor:
                colors.surfaceElevated,
              borderColor:
                colors.border,
            },
          ]}
        />

        <Pressable
          accessibilityLabel="Send message"
          onPress={
            sendMessage
          }
          disabled={
            !draft.trim() ||
            !activeChannel ||
            sending
          }
          style={[
            styles.sendButton,
            {
              backgroundColor:
                accentColor,

              opacity:
                !draft.trim() ||
                !activeChannel ||
                sending
                  ? 0.45
                  : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Ionicons
              name="send"
              size={17}
              color="#FFFFFF"
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function CommunityPosts() {
  const {
    colors,
    theme,
  } = useTheme();

  const accentColor =
    theme === 'light'
      ? '#1e6827'
      : colors.primary;

  const [
    posts,
    setPosts,
  ] =
    useState<
      FeedPost[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    composerOpen,
    setComposerOpen,
  ] =
    useState(false);

  const [
    postBody,
    setPostBody,
  ] =
    useState('');

  const [
    linkUrl,
    setLinkUrl,
  ] =
    useState('');

  const [
    posting,
    setPosting,
  ] =
    useState(false);

  const [
    commentsOpen,
    setCommentsOpen,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});

  const [
    commentsByPost,
    setCommentsByPost,
  ] =
    useState<
      Record<
        string,
        FeedComment[]
      >
    >({});

  const [
    commentDrafts,
    setCommentDrafts,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const loadFeed =
    useCallback(
      async () => {
        try {
          setError('');

          const result =
            await api.get<
              FeedPost[]
            >(
              '/community-chat/feed?take=50',
            );

          setPosts(
            Array.isArray(result)
              ? result
              : [],
          );
        } catch (e) {
          setPosts([]);

          setError(
            e instanceof Error
              ? e.message
              : 'Could not load Community posts.',
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function createPost() {
    const body =
      postBody.trim();

    if (
      !body ||
      posting
    ) {
      return;
    }

    if (
      linkUrl.trim() &&
      !/^https?:\/\//i.test(
        linkUrl.trim(),
      )
    ) {
      setError(
        'Links must begin with http:// or https://.',
      );

      return;
    }

    try {
      setPosting(true);
      setError('');

      const created =
        await api.post<
          FeedPost
        >(
          '/community-chat/feed',
          {
            body,
            postType:
              'POST',
            linkUrl:
              linkUrl.trim() ||
              undefined,
          },
        );

      if (
        created &&
        created.id
      ) {
        setPosts(
          (
            current,
          ) => [
            created,
            ...current,
          ],
        );
      } else {
        await loadFeed();
      }

      setPostBody('');
      setLinkUrl('');
      setComposerOpen(
        false,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not publish this post.',
      );
    } finally {
      setPosting(false);
    }
  }

  async function toggleLike(
    post: FeedPost,
  ) {
    try {
      const result =
        await api.post<{
          liked: boolean;
          likeCount: number;
        }>(
          `/community-chat/feed/${post.id}/like`,
          {},
        );

      setPosts(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              post.id
                ? {
                    ...item,
                    likedByMe:
                      result.liked,
                    likeCount:
                      result.likeCount,
                  }
                : item,
          ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not update this like.',
      );
    }
  }

  async function toggleComments(
    post: FeedPost,
  ) {
    const next =
      !commentsOpen[
        post.id
      ];

    setCommentsOpen(
      (
        current,
      ) => ({
        ...current,
        [post.id]:
          next,
      }),
    );

    if (
      next &&
      !commentsByPost[
        post.id
      ]
    ) {
      try {
        const result =
          await api.get<
            FeedComment[]
          >(
            `/community-chat/feed/${post.id}/comments`,
          );

        setCommentsByPost(
          (
            current,
          ) => ({
            ...current,
            [post.id]:
              Array.isArray(
                result,
              )
                ? result
                : [],
          }),
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Could not load comments.',
        );
      }
    }
  }

  async function addComment(
    post: FeedPost,
  ) {
    const body =
      (
        commentDrafts[
          post.id
        ] ?? ''
      ).trim();

    if (!body) {
      return;
    }

    try {
      const created =
        await api.post<
          FeedComment
        >(
          `/community-chat/feed/${post.id}/comments`,
          {
            body,
          },
        );

      setCommentsByPost(
        (
          current,
        ) => ({
          ...current,
          [post.id]: [
            ...(current[
              post.id
            ] ?? []),
            created,
          ],
        }),
      );

      setCommentDrafts(
        (
          current,
        ) => ({
          ...current,
          [post.id]:
            '',
        }),
      );

      setPosts(
        (
          current,
        ) =>
          current.map(
            (
              item,
            ) =>
              item.id ===
              post.id
                ? {
                    ...item,
                    commentCount:
                      (item.commentCount ??
                        0) +
                      1,
                  }
                : item,
          ),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not add your comment.',
      );
    }
  }

  async function sharePost(
    post: FeedPost,
  ) {
    try {
      await Share.share({
        message:
          `${displayName(
            post.firstName,
            post.lastName,
          )} on SynergySphere:\n\n${post.body}` +
          (post.linkUrl
            ? `\n${post.linkUrl}`
            : ''),
      });
    } catch {
      // User can dismiss share sheet.
    }
  }

  return (
    <View
      style={
        styles.postsWrap
      }
    >
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor:
                colors.surfaceElevated,
              borderColor:
                colors.border,
              borderWidth: 1,
              borderRadius:
                12,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={17}
            color="#B3261E"
          />

          <Text
            style={[
              styles.errorText,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {error}
          </Text>

          <Pressable
            onPress={() =>
              setError('')
            }
          >
            <Ionicons
              name="close"
              size={17}
              color={
                colors.muted
              }
            />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={() =>
          setComposerOpen(
            true,
          )
        }
        style={[
          styles.startPost,
          {
            backgroundColor:
              colors.surface,
            borderColor:
              colors.border,
          },
        ]}
      >
        <Avatar
          size={42}
        />

        <View
          style={[
            styles.startPostInput,
            {
              backgroundColor:
                colors.surfaceElevated,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Text
            style={{
              color:
                colors.muted,
            }}
          >
            Share something with the community...
          </Text>
        </View>
      </Pressable>

      <View
        style={
          styles.feedHeading
        }
      >
        <View>
          <Text
            style={[
              styles.cardTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            Community Posts
          </Text>

          <Text
            style={[
              styles.cardText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            Share updates, questions and links.
          </Text>
        </View>

        <Pressable
          onPress={
            loadFeed
          }
          style={[
            styles.iconButton,
            {
              backgroundColor:
                colors.surfaceElevated,
            },
          ]}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={
              accentColor
            }
          />
        </Pressable>
      </View>

      {loading ? (
        <View
          style={
            styles.postsLoading
          }
        >
          <ActivityIndicator
            color={
              accentColor
            }
          />
        </View>
      ) : posts.length ===
        0 ? (
        <View
          style={[
            styles.emptyPostsCard,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="people-circle-outline"
            size={36}
            color={
              accentColor
            }
          />

          <Text
            style={[
              styles.emptyTitle,
              {
                color:
                  colors.text,
              },
            ]}
          >
            No posts yet
          </Text>

          <Text
            style={[
              styles.cardText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            Be the first to share something.
          </Text>
        </View>
      ) : (
        posts.map(
          (
            post,
          ) => (
            <View
              key={
                post.id
              }
              style={[
                styles.postCard,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <View
                style={
                  styles.postAuthorRow
                }
              >
                <Avatar
                  firstName={
                    post.firstName
                  }
                  lastName={
                    post.lastName
                  }
                  picture={
                    post.profilePicture
                  }
                  size={42}
                />

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.postAuthor,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {displayName(
                      post.firstName,
                      post.lastName,
                    )}
                  </Text>

                  <Text
                    style={[
                      styles.cardText,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {post.role ||
                      'Student'}{' '}
                    •{' '}
                    {timeLabel(
                      post.createdAt,
                    )}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.postBody,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {
                  post.body
                }
              </Text>

              {post.linkUrl ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      post.linkUrl!,
                    )
                  }
                  style={[
                    styles.linkCard,
                    {
                      backgroundColor:
                        colors.surfaceElevated,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="link-outline"
                    size={17}
                    color={
                      accentColor
                    }
                  />

                  <Text
                    numberOfLines={
                      2
                    }
                    style={{
                      flex: 1,
                      color:
                        accentColor,
                      fontSize:
                        12,
                    }}
                  >
                    {
                      post.linkUrl
                    }
                  </Text>
                </Pressable>
              ) : null}

              <View
                style={[
                  styles.actions,
                  {
                    borderTopColor:
                      colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    toggleLike(
                      post,
                    )
                  }
                  style={
                    styles.actionButton
                  }
                >
                  <Ionicons
                    name={
                      post.likedByMe
                        ? 'heart'
                        : 'heart-outline'
                    }
                    size={
                      19
                    }
                    color={
                      post.likedByMe
                        ? accentColor
                        : colors.muted
                    }
                  />

                  <Text
                    style={{
                      color:
                        post.likedByMe
                          ? accentColor
                          : colors.muted,
                      fontSize:
                        11,
                    }}
                  >
                    {post.likeCount ??
                      0}{' '}
                    Like
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    toggleComments(
                      post,
                    )
                  }
                  style={
                    styles.actionButton
                  }
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={
                      18
                    }
                    color={
                      colors.muted
                    }
                  />

                  <Text
                    style={{
                      color:
                        colors.muted,
                      fontSize:
                        11,
                    }}
                  >
                    {post.commentCount ??
                      0}{' '}
                    Comment
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    sharePost(
                      post,
                    )
                  }
                  style={
                    styles.actionButton
                  }
                >
                  <Ionicons
                    name="share-social-outline"
                    size={
                      18
                    }
                    color={
                      colors.muted
                    }
                  />

                  <Text
                    style={{
                      color:
                        colors.muted,
                      fontSize:
                        11,
                    }}
                  >
                    Share
                  </Text>
                </Pressable>
              </View>

              {commentsOpen[
                post.id
              ] ? (
                <View
                  style={[
                    styles.comments,
                    {
                      borderTopColor:
                        colors.border,
                    },
                  ]}
                >
                  {(commentsByPost[
                    post.id
                  ] ?? []).map(
                    (
                      comment,
                    ) => (
                      <View
                        key={
                          comment.id
                        }
                        style={
                          styles.commentRow
                        }
                      >
                        <Avatar
                          firstName={
                            comment.firstName
                          }
                          lastName={
                            comment.lastName
                          }
                          size={
                            30
                          }
                        />

                        <View
                          style={[
                            styles.commentBubble,
                            {
                              backgroundColor:
                                colors.surfaceElevated,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                colors.text,
                              fontSize:
                                11,
                              fontWeight:
                                '800',
                            }}
                          >
                            {displayName(
                              comment.firstName,
                              comment.lastName,
                            )}
                          </Text>

                          <Text
                            style={{
                              color:
                                colors.text,
                              fontSize:
                                12,
                            }}
                          >
                            {
                              comment.body
                            }
                          </Text>
                        </View>
                      </View>
                    ),
                  )}

                  <View
                    style={
                      styles.commentComposer
                    }
                  >
                    <TextInput
                      value={
                        commentDrafts[
                          post.id
                        ] ?? ''
                      }
                      onChangeText={(
                        value,
                      ) =>
                        setCommentDrafts(
                          (
                            current,
                          ) => ({
                            ...current,
                            [post.id]:
                              value,
                          }),
                        )
                      }
                      placeholder="Write a comment..."
                      placeholderTextColor={
                        colors.muted
                      }
                      style={[
                        styles.commentInput,
                        {
                          color:
                            colors.text,
                          backgroundColor:
                            colors.surfaceElevated,
                          borderColor:
                            colors.border,
                        },
                      ]}
                    />

                    <Pressable
                      onPress={() =>
                        addComment(
                          post,
                        )
                      }
                      style={[
                        styles.commentSend,
                        {
                          backgroundColor:
                            accentColor,
                        },
                      ]}
                    >
                      <Ionicons
                        name="send"
                        size={15}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ),
        )
      )}

      <Modal
        visible={
          composerOpen
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setComposerOpen(
            false,
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <Pressable
            style={
              StyleSheet.absoluteFill
            }
            onPress={() =>
              setComposerOpen(
                false,
              )
            }
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor:
                    colors.surface,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Create a post
                </Text>

                <Pressable
                  onPress={() =>
                    setComposerOpen(
                      false,
                    )
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={
                      colors.text
                    }
                  />
                </Pressable>
              </View>

              <TextInput
                autoFocus
                multiline
                value={
                  postBody
                }
                onChangeText={
                  setPostBody
                }
                placeholder="What would you like to share?"
                placeholderTextColor={
                  colors.muted
                }
                style={[
                  styles.postInput,
                  {
                    color:
                      colors.text,
                    backgroundColor:
                      colors.surfaceElevated,
                    borderColor:
                      colors.border,
                  },
                ]}
              />

              <TextInput
                value={
                  linkUrl
                }
                onChangeText={
                  setLinkUrl
                }
                autoCapitalize="none"
                keyboardType="url"
                placeholder="Optional link: https://..."
                placeholderTextColor={
                  colors.muted
                }
                style={[
                  styles.linkInput,
                  {
                    color:
                      colors.text,
                    backgroundColor:
                      colors.surfaceElevated,
                    borderColor:
                      colors.border,
                  },
                ]}
              />

              <Pressable
                onPress={
                  createPost
                }
                disabled={
                  !postBody.trim() ||
                  posting
                }
                style={[
                  styles.publishButton,
                  {
                    backgroundColor:
                      accentColor,

                    opacity:
                      !postBody.trim() ||
                      posting
                        ? 0.45
                        : 1,
                  },
                ]}
              >
                {posting ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Text
                      style={
                        styles.publishText
                      }
                    >
                      Post
                    </Text>

                    <Ionicons
                      name="send"
                      size={16}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}


export function CommunityChat({
  initialView = 'live',
}: {
  initialView?: 'live' | 'posts';
} = {}) {
  const { colors, theme } = useTheme();
  const accentColor = theme === 'light' ? '#1e6827' : colors.primary;

  const [chatView, setChatView] = useState<'live' | 'posts'>(initialView);

  useEffect(() => {
    if (initialView) {
      setChatView(initialView);
    }
  }, [initialView]);

  return (
    <View style={styles.chatSectionContainer}>
      <View
        style={[
          styles.innerTabBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => setChatView('live')}
          style={[
            styles.innerTabButton,
            chatView === 'live' && {
              backgroundColor: colors.surfaceElevated,
              borderColor: accentColor,
            },
          ]}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={16}
            color={chatView === 'live' ? accentColor : colors.muted}
          />
          <Text
            style={[
              styles.innerTabText,
              {
                color: chatView === 'live' ? accentColor : colors.text,
              },
            ]}
          >
            Live Chat
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setChatView('posts')}
          style={[
            styles.innerTabButton,
            chatView === 'posts' && {
              backgroundColor: colors.surfaceElevated,
              borderColor: accentColor,
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={chatView === 'posts' ? accentColor : colors.muted}
          />
          <Text
            style={[
              styles.innerTabText,
              {
                color: chatView === 'posts' ? accentColor : colors.text,
              },
            ]}
          >
            Community Posts
          </Text>
        </Pressable>
      </View>

      {chatView === 'live' ? <LiveChat /> : <CommunityPosts />}
    </View>
  );
}

const styles = StyleSheet.create({
  chatSectionContainer: {
    gap: 12,
  },
    innerTabBar: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },

    innerTabButton: {
      flex: 1,
      minHeight: 40,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    innerTabText: {
      fontSize: 12,
      fontWeight: '800',
    },

    chatCard: {
      borderWidth: 1,
      borderRadius: 18,
      overflow: 'hidden',
      minHeight: 510,
    },

    chatHeading: {
      minHeight: 70,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    cardTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    cardText: {
      fontSize: 12,
      lineHeight: 17,
    },

    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },

    channelsSection: {
      minHeight: 55,
      borderBottomWidth: 1,
      justifyContent: 'center',
      paddingVertical: 8,
    },

    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },

    channelRow: {
      paddingHorizontal: 10,
      gap: 7,
      alignItems: 'center',
    },

    channelPill: {
      minHeight: 35,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    channelText: {
      fontSize: 11,
      fontWeight: '800',
    },

    errorBox: {
      minHeight: 42,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 11,
    },

    errorText: {
      flex: 1,
      fontSize: 11,
    },

    messagesArea: {
      height: 310,
    },

    emptyState: {
      flex: 1,
      minHeight: 230,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
    },

    messageScroll: {
      flex: 1,
    },

    messageList: {
      padding: 12,
      gap: 11,
    },

    messageBlock: {
      alignItems: 'flex-start',
      gap: 4,
    },

    messageMeta: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },

    messageAuthor: {
      fontSize: 10,
      fontWeight: '800',
    },

    messageTime: {
      fontSize: 9,
    },

    messageBubble: {
      maxWidth: '88%',
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },

    messageText: {
      fontSize: 13,
      lineHeight: 18,
    },

    composer: {
      minHeight: 62,
      borderTopWidth: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      padding: 9,
    },

    messageInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 90,
      borderWidth: 1,
      borderRadius: 15,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      textAlignVertical: 'top',
    },

    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatar: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    postsWrap: {
      gap: 12,
    },

    startPost: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    startPostInput: {
      flex: 1,
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 21,
      justifyContent: 'center',
      paddingHorizontal: 13,
    },

    feedHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    postsLoading: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyPostsCard: {
      minHeight: 180,
      borderWidth: 1,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
    },

    postCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      gap: 11,
    },

    postAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    postAuthor: {
      fontSize: 13,
      fontWeight: '900',
    },

    postBody: {
      fontSize: 13,
      lineHeight: 19,
    },

    linkCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 9,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },

    actions: {
      borderTopWidth: 1,
      paddingTop: 9,
      flexDirection: 'row',
    },

    actionButton: {
      flex: 1,
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    comments: {
      borderTopWidth: 1,
      paddingTop: 9,
      gap: 8,
    },

    commentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },

    commentBubble: {
      flex: 1,
      borderRadius: 11,
      padding: 8,
      gap: 2,
    },

    commentComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    commentInput: {
      flex: 1,
      minHeight: 39,
      borderWidth: 1,
      borderRadius: 15,
      paddingHorizontal: 11,
      fontSize: 12,
    },

    commentSend: {
      width: 39,
      height: 39,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor:
        'rgba(0,0,0,0.45)',
    },

    modalSheet: {
      borderTopWidth: 1,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 16,
      gap: 12,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    modalTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    postInput: {
      minHeight: 120,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      textAlignVertical: 'top',
    },

    linkInput: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
    },

    publishButton: {
      minHeight: 46,
      borderRadius: 23,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    publishText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
    },

    placeholderCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 18,
      gap: 8,
    },
  });
